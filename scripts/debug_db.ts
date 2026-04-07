
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Checking daily_stocks...')
  const { data: dailyStocks, error: dsError } = await supabase
    .from('daily_stocks')
    .select('game_date, id, stock_id')
    .order('game_date', { ascending: false })
    .limit(10)
  
  if (dsError) {
    console.error('Error fetching daily_stocks:', dsError)
  } else {
    console.log('Latest daily_stocks:', dailyStocks)
    
    // Check if these stocks exist
    const stockIds = dailyStocks.map(ds => ds.stock_id).filter(Boolean)
    if (stockIds.length > 0) {
      const { data: stocks, error: sError } = await supabase
        .from('stocks')
        .select('id, name')
        .in('id', stockIds)
      
      if (sError) {
        console.error('Error fetching stocks:', sError)
      } else {
        console.log('Found matching stocks:', stocks)
        const foundIds = stocks.map(s => s.id)
        const missingIds = stockIds.filter(id => !foundIds.includes(id))
        if (missingIds.length > 0) {
          console.warn('Missing stock IDs:', missingIds)
        }
      }
    }
  }

  console.log('\nChecking batch_execution_logs...')
  const { data: logs, error: logError } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5)
  
  if (logError) {
    console.error('Error fetching logs:', logError)
  } else {
    console.log('Latest logs:', logs)
  }

  console.log('\nChecking stock_price_history...')
  const { data: history, error: historyError } = await supabase
    .from('stock_price_history')
    .select('*')
    .order('price_date', { ascending: false })
    .limit(10)
  
  if (historyError) {
    console.error('Error fetching history:', historyError)
  } else {
    console.log('Latest history:', history)
  }
}

check()
