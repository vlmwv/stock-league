import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function resyncOnlyCounts() {
  console.log('Fetching all stocks...')
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('id, name, ai_recommendation_count')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Processing ${stocks.length} stocks...`)
  let updatedCount = 0
  for (const stock of stocks) {
    const { count, error: dsErr } = await supabase
      .from('daily_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('stock_id', stock.id)
      .neq('status', 'withdrawn')

    if (dsErr) continue

    if (stock.ai_recommendation_count !== count) {
      console.log(`Resyncing ${stock.name}: Count ${stock.ai_recommendation_count} -> ${count}`)
      
      const { error: updateErr } = await supabase
        .from('stocks')
        .update({
          ai_recommendation_count: count
        } as any)
        .eq('id', stock.id)
      
      if (!updateErr) updatedCount++
    }
  }
  console.log(`Successfully resynced ${updatedCount} stocks.`)
}

resyncOnlyCounts()
