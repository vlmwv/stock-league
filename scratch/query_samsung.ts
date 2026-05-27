import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars: NUXT_PUBLIC_SUPABASE_URL or NUXT_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Querying Samsung Electronics from stocks table...')
  const { data: stockData, error: stockError } = await supabase
    .from('stocks')
    .select('*')
    .or('name.eq.삼성전자,code.eq.005930')
  
  if (stockError) {
    console.error('Error fetching Samsung Electronics:', stockError)
  } else {
    console.log('Samsung Electronics stock data:', stockData)
    
    if (stockData && stockData.length > 0) {
      const stockId = stockData[0].id;
      console.log('\nQuerying price history for Samsung Electronics (limit 10)...')
      const { data: historyData, error: historyError } = await supabase
        .from('stock_price_history')
        .select('*')
        .eq('stock_id', stockId)
        .order('price_date', { ascending: false })
        .limit(10)
      
      if (historyError) {
        console.error('Error fetching price history:', historyError)
      } else {
        console.log('Samsung Electronics price history:', historyData)
      }
    }
  }
}

run()
