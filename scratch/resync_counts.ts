import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function resync() {
  console.log('Fetching all stocks...')
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('id, name, ai_recommendation_count, last_recommendation_date')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Processing ${stocks.length} stocks...`)
  let updatedCount = 0
  for (const stock of stocks) {
    const { data: dailyRows, error: dsErr } = await supabase
      .from('daily_stocks')
      .select('game_date')
      .eq('stock_id', stock.id)
      .neq('status', 'withdrawn')

    if (dsErr) continue

    const actualCount = dailyRows.length
    const latestDate = dailyRows.length > 0 
      ? dailyRows.map(r => r.game_date).sort().reverse()[0]
      : null

    if (stock.ai_recommendation_count !== actualCount || stock.last_recommendation_date !== latestDate) {
      console.log(`Resyncing ${stock.name}:`)
      console.log(`  Count: ${stock.ai_recommendation_count} -> ${actualCount}`)
      console.log(`  Date: ${stock.last_recommendation_date} -> ${latestDate}`)
      
      const { error: updateErr } = await supabase
        .from('stocks')
        .update({
          ai_recommendation_count: actualCount,
          last_recommendation_date: latestDate
        } as any)
        .eq('id', stock.id)
      
      if (!updateErr) updatedCount++
    }
  }
  console.log(`Successfully resynced ${updatedCount} stocks.`)
}

resync()
