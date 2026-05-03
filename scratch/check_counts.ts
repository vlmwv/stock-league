import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCounts() {
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('id, name, ai_recommendation_count')
    .gt('ai_recommendation_count', 0)
    .order('ai_recommendation_count', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching stocks:', error)
    return
  }

  for (const stock of stocks) {
    const { count, error: countError } = await supabase
      .from('daily_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('stock_id', stock.id)
      .neq('status', 'withdrawn')

    if (countError) {
      console.error(`Error counting for ${stock.name}:`, countError)
      continue
    }

    console.log(`${stock.name}: DB Count=${stock.ai_recommendation_count}, Actual Count (non-withdrawn)=${count}`)
    
    const { count: totalCount } = await supabase
      .from('daily_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('stock_id', stock.id)
    
    console.log(`  Total Count (including withdrawn)=${totalCount}`)
  }
}

checkCounts()
