import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    console.log('Transfer Hall of Fame cron triggered...')

    // 1. Calculate previous month and (if applicable) previous year
    const now = new Date()
    // Use KST to be aligned with Korea time
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    
    // Previous month calculation
    const prevMonthDate = new Date(kstDate.getFullYear(), kstDate.getMonth() - 1, 1)
    const prevMonthYear = prevMonthDate.getFullYear()
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0')
    const monthlyKey = `${prevMonthYear}-${prevMonth}` // e.g. '2024-03'

    const tasks = []
    
    // Function to transfer data
    const transferData = async (rankingType: string, periodType: string, periodKey: string) => {
      console.log(`Transferring ${rankingType} data for ${periodKey} to Hall of Fame...`)
      
      // Fetch top 100 from rankings
      const { data: rankings, error: fetchError } = await supabase
        .from('rankings')
        .select('user_id, rank, win_rate, prediction_count')
        .eq('ranking_type', rankingType)
        .eq('period_key', periodKey)
        .lte('rank', 100)
        .order('rank', { ascending: true })

      if (fetchError) {
        throw new Error(`Failed to fetch rankings for ${periodKey}: ${fetchError.message}`)
      }

      if (!rankings || rankings.length === 0) {
        console.log(`No records found for ${rankingType} ${periodKey}`)
        return { type: rankingType, period_key: periodKey, count: 0 }
      }

      // Map to hall_of_fame schema
      const hofRecords = rankings.map(r => ({
        user_id: r.user_id,
        period_type: periodType,
        period_key: periodKey,
        rank: r.rank,
        win_rate: r.win_rate,
        prediction_count: r.prediction_count,
        points: 0 // Default points as rankings doesn't have points column
      }))

      // Insert into hall_of_fame (upsert to prevent duplicate issues on retries)
      const { error: insertError } = await supabase
        .from('hall_of_fame')
        .upsert(hofRecords, { onConflict: 'user_id,period_type,period_key' })

      if (insertError) {
        throw new Error(`Failed to insert into hall_of_fame for ${periodKey}: ${insertError.message}`)
      }

      console.log(`Successfully transferred ${hofRecords.length} records for ${periodKey}`)
      return { type: rankingType, period_key: periodKey, count: hofRecords.length }
    }

    // Always transfer monthly data for the previous month
    tasks.push(transferData('monthly', 'monthly', monthlyKey))

    // If it's January, also transfer yearly data for the previous year
    // The first Sunday of January is the time to transfer the previous year's data
    if (kstDate.getMonth() === 0) {
      const prevYearKey = String(kstDate.getFullYear() - 1)
      tasks.push(transferData('yearly', 'yearly', prevYearKey))
    }

    const results = await Promise.all(tasks)

    return new Response(JSON.stringify({
      message: 'Successfully transferred Hall of Fame data',
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('Fatal Edge Function Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
