import { createClient } from '@supabase/supabase-js'
import { isAuthorizedBatchCall, unauthorizedResponse } from '../_shared/auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 집계·순위 계산·upsert는 DB 함수(calculate_rankings)가 한 문장으로 수행한다.
// 예전처럼 predictions를 전건 조회해 Deno에서 집계하면 PostgREST의 max_rows(기본 1000)에
// 조용히 잘린 데이터로 랭킹이 계산된다. 이 함수는 트리거와 실행 로그만 담당한다.
Deno.serve(async (req) => {
  // 인가: cron/서버(service_role)만 호출할 수 있다. verify_jwt만으로는 anon 키 호출이 통과된다.
  if (!isAuthorizedBatchCall(req)) return unauthorizedResponse()

  try {
    console.log('Calculating rankings...')
    const startTime = new Date().toISOString()

    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'calculate-rankings',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()

    const { data, error } = await supabase.rpc('calculate_rankings')
    if (error) throw error

    // RETURNS TABLE이므로 단일 행 배열로 반환된다.
    const summary = Array.isArray(data) ? data[0] : data
    const rankingRows = Number(summary?.ranking_rows ?? 0)
    const predictionRows = Number(summary?.prediction_rows ?? 0)

    console.log(`Upserted ${rankingRows} ranking records from ${predictionRows} graded predictions.`)

    // 로그 종료 기록
    if (logEntry) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: rankingRows,
          message: `Rankings calculated successfully (predictions: ${predictionRows})`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify({
      message: 'Rankings calculated successfully',
      count: rankingRows,
      predictions: predictionRows
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('Ranking Calculation Error:', err.message)
    try {
      await supabase
        .from('batch_execution_logs')
        .insert({
          function_name: 'calculate-rankings',
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
    } catch (e) {
      console.error('Failed to log error to DB:', e)
    }

    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
