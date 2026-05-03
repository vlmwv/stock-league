import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function findTrueMismatches() {
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('id, name, ai_recommendation_count')

  if (error) {
    console.error('Error:', error)
    return
  }

  let mismatchCount = 0
  for (const stock of stocks) {
    const { count, error: countError } = await supabase
      .from('daily_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('stock_id', stock.id)

    if (countError) continue

    if (stock.ai_recommendation_count !== count) {
      console.log(`Mismatch for ${stock.name}: DB=${stock.ai_recommendation_count}, Total Rows=${count}`)
      mismatchCount++
    }
  }
  console.log(`Total true mismatches: ${mismatchCount}`)
}

findTrueMismatches()
