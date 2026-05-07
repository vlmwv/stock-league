
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStocks() {
  const codes = ['005490', '009150'] // POSCO Holdings, Samsung Electro-Mechanics
  
  const { data: stocks, error: stockError } = await supabase
    .from('stocks')
    .select('id, name, code, ai_recommendation_count, last_recommendation_date')
    .in('code', codes)

  if (stockError) {
    console.error('Stock error:', stockError)
    return
  }

  console.log('--- Stocks Info ---')
  for (const s of stocks) {
    console.log(`${s.name} (${s.code}): count=${s.ai_recommendation_count}, last_date=${s.last_recommendation_date}`)
    
    const { count, error: dsError } = await supabase
      .from('daily_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('stock_id', s.id)
      .neq('status', 'withdrawn')

    console.log(`  Actual daily_stocks count: ${count}`)
    
    const { data: latest, error: lError } = await supabase
      .from('daily_stocks')
      .select('game_date')
      .eq('stock_id', s.id)
      .neq('status', 'withdrawn')
      .order('game_date', { ascending: false })
      .limit(1)
    
    console.log(`  Latest game_date in daily_stocks: ${latest?.[0]?.game_date}`)
  }
}

checkStocks()
