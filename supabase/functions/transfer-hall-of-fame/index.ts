import { createClient } from '@supabase/supabase-js'
import { isAuthorizedBatchCall, unauthorizedResponse } from '../_shared/auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 명예의 전당에 보관할 상위 순위 인원수. 이 순위 밖은 아카이브하지 않는다.
const TOP_N = 100

// rankings.ranking_type → hall_of_fame.period_type 매핑. 'monthly'/'yearly'만 이관한다.
type PeriodType = 'monthly' | 'yearly'

// 직전 달 키('YYYY-MM'). 크론이 매월 1일에 실행되므로 방금 끝난 달을 가리킨다.
function getPrevMonthKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// 직전 연도 키('YYYY'). 1월 실행 시에만 방금 끝난 연도를 이관한다.
function getPrevYearKey(now: Date): string {
  return String(now.getUTCFullYear() - 1)
}

// 특정 기간(rankings) 상위 TOP_N을 hall_of_fame으로 upsert. 처리 건수를 반환한다.
async function transferPeriod(periodType: PeriodType, periodKey: string): Promise<number> {
  const { data: rankings, error: fetchError } = await supabase
    .from('rankings')
    .select('user_id, rank, win_rate, prediction_count, win_count')
    .eq('ranking_type', periodType)
    .eq('period_key', periodKey)
    .lte('rank', TOP_N)
    .order('rank', { ascending: true })

  if (fetchError) throw fetchError
  if (!rankings || rankings.length === 0) {
    console.log(`No rankings to transfer for ${periodType} ${periodKey}`)
    return 0
  }

  const records = rankings.map(r => ({
    user_id: r.user_id,
    period_type: periodType,
    period_key: periodKey,
    rank: r.rank,
    win_rate: r.win_rate ?? 0,
    prediction_count: r.prediction_count ?? 0,
    points: r.win_count ?? 0,
  }))

  const { error: upsertError } = await supabase
    .from('hall_of_fame')
    .upsert(records, { onConflict: 'user_id, period_type, period_key' })

  if (upsertError) throw upsertError

  console.log(`Transferred ${records.length} records for ${periodType} ${periodKey}`)
  return records.length
}

Deno.serve(async (req) => {
  // 인가: cron/서버(service_role)만 호출할 수 있다. verify_jwt만으로는 anon 키 호출이 통과된다.
  if (!isAuthorizedBatchCall(req)) return unauthorizedResponse()

  const startTime = new Date().toISOString()
  let logId: string | null = null

  try {
    console.log('Transferring hall of fame...')

    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'transfer-hall-of-fame',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    logId = logEntry?.id ?? null

    // 수동 백필 지원: body로 { monthKey, yearKey }를 넘기면 해당 기간만 이관한다.
    let body: { monthKey?: string, yearKey?: string } = {}
    try {
      if (req.headers.get('content-type')?.includes('application/json')) {
        body = await req.json()
      }
    } catch (_) {
      // body 없음/파싱 실패는 무시하고 자동 계산 경로로 진행
    }

    const now = new Date()
    const monthKey = body.monthKey || getPrevMonthKey(now)
    // 자동 실행 시 1월(직전 달이 12월)에만 연간 이관. 수동 yearKey가 있으면 항상 이관.
    const yearKey = body.yearKey || (now.getUTCMonth() === 0 ? getPrevYearKey(now) : null)

    let processed = 0
    processed += await transferPeriod('monthly', monthKey)
    if (yearKey) {
      processed += await transferPeriod('yearly', yearKey)
    }

    const message = `Transferred hall of fame — monthly ${monthKey}${yearKey ? `, yearly ${yearKey}` : ''} (top ${TOP_N})`

    // 로그 종료 기록
    if (logId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: processed,
          message,
          finished_at: new Date().toISOString()
        })
        .eq('id', logId)
    }

    return new Response(JSON.stringify({ message, count: processed }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('Hall of Fame Transfer Error:', err.message)
    try {
      if (logId) {
        await supabase
          .from('batch_execution_logs')
          .update({
            status: 'fail',
            message: err.message,
            error_detail: { stack: err.stack },
            finished_at: new Date().toISOString()
          })
          .eq('id', logId)
      } else {
        await supabase
          .from('batch_execution_logs')
          .insert({
            function_name: 'transfer-hall-of-fame',
            status: 'fail',
            message: err.message,
            error_detail: { stack: err.stack },
            finished_at: new Date().toISOString()
          })
      }
    } catch (e) {
      console.error('Failed to log error to DB:', e)
    }

    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
