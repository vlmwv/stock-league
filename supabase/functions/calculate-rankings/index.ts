import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  try {
    console.log('Calculating rankings...')
    const startTime = new Date().toISOString()
    
    // 로그 시작 기록
    const { data: logEntry, error: logStartError } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'calculate-rankings',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()

    const now = new Date()
    const weekKey = getWeekNumber(now)
    const monthKey = getMonthKey(now)

    // 1. Fetch finished predictions
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('user_id, result, game_date')
      .neq('result', 'pending')

    if (predError) throw predError

    // 2. Aggregate by user and period
    const stats: Record<string, any> = {}

    predictions.forEach(p => {
      const date = new Date(p.game_date)
      const pWeek = getWeekNumber(date)
      const pMonth = getMonthKey(date)

      const pYear = String(date.getUTCFullYear())

      const updateStat = (type: string, key: string) => {
        const id = `${p.user_id}_${type}_${key}`
        if (!stats[id]) {
          stats[id] = { user_id: p.user_id, type, key, win: 0, total: 0 }
        }
        stats[id].total++
        if (p.result === 'win') stats[id].win++
      }

      updateStat('weekly', pWeek)
      updateStat('monthly', pMonth)
      updateStat('yearly', pYear)
      updateStat('all_time', 'global')
    })

    // 3. Calculate Win Rates and Prepare Records
    const records = Object.values(stats).map(s => {
      const winRate = s.total > 0 ? (s.win / s.total) * 100 : 0
      
      // 참여 횟수 제한 없이 모든 참여자를 랭킹에 포함 (사용자 요청 반영)
      return {
        user_id: s.user_id,
        ranking_type: s.type,
        period_key: s.key,
        win_rate: parseFloat(winRate.toFixed(2)),
        prediction_count: s.total,
        win_count: s.win, // 추가된 컬럼 반영
        updated_at: new Date().toISOString(),
        rank: 0 
      }
    })

    // 4. Group by Type/Key and Assign Ranks (Sort by win_rate DESC, then prediction_count DESC)
    const grouped: Record<string, any[]> = {}
    records.forEach(r => {
      const gKey = `${r.ranking_type}_${r.period_key}`
      if (!grouped[gKey]) grouped[gKey] = []
      grouped[gKey].push(r)
    })

    const finalRecords: any[] = []
    for (const gKey in grouped) {
      const group = grouped[gKey]
      // 승률 -> 참여 횟수 순으로 정렬하여 순위 부여
      group.sort((a, b) => b.win_rate - a.win_rate || b.prediction_count - a.prediction_count)
      group.forEach((r, idx) => {
        r.rank = idx + 1
        finalRecords.push(r)
      })
    }

    console.log(`Prepared ${finalRecords.length} ranking records. Upserting...`)

    // 5. Update Rankings Table (Bulk Upsert)
    if (finalRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('rankings')
        .upsert(finalRecords, { onConflict: 'user_id, ranking_type, period_key' })
      
      if (upsertError) throw upsertError
    }

    // 로그 종료 기록
    if (logEntry) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: finalRecords.length,
          message: 'Rankings calculated successfully',
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify({ 
      message: 'Rankings calculated successfully', 
      count: finalRecords.length 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('Ranking Calculation Error:', err.message)
    // 에러 발생 시 로그 업데이트 시도 (함수 실행 중 logEntry가 생성된 경우에만)
    // 이 시점에서는 supabase 인스턴스가 살아있어야 함
    try {
      // logEntry를 찾기 위해 별도의 쿼리가 필요할 수 있지만, 여기서는 최대한 시도
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
