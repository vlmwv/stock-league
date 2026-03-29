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
      
      // Calculate min required predictions (3 per day in period)
      let minRequired = 0
      const date = new Date()
      if (s.type === 'monthly') {
        // Current day of month * 3
        minRequired = date.getDate() * 3
      } else if (s.type === 'yearly') {
        // Approximate: Months passed * 30 * 3
        minRequired = (date.getMonth() * 30 + date.getDate()) * 3
      } else if (s.type === 'weekly') {
        // Day of week (0=Sun, 6=Sat) * 3
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
        minRequired = dayOfWeek * 3
      }

      // Filter out those who don't meet the requirement for active rankings
      // (Keep them in DB but maybe mark them or just filter them here)
      // The user said "포함하며", implying others are excluded from the ranking list.
      if (s.total < minRequired && s.type !== 'all_time') {
        return null
      }

      return {
        user_id: s.user_id,
        ranking_type: s.type,
        period_key: s.key,
        win_rate: parseFloat(winRate.toFixed(2)),
        prediction_count: s.total,
        updated_at: new Date().toISOString(),
        rank: 0 
      }
    }).filter(r => r !== null)

    // 4. Update Rankings Table
    for (const record of records) {
      await supabase
        .from('rankings')
        .upsert(record, { onConflict: 'user_id, ranking_type, period_key' })
    }

    // 5. Update actual Rank numbers (Simplified logic for now)
    // In a real scenario, you'd calculate dense_rank() over win_rate descending.
    
    return new Response(JSON.stringify({ message: 'Rankings calculated successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
