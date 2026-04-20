
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDailyStocks() {
  const { data, error } = await supabase
    .from('daily_stocks')
    .select('id, game_date, stocks(name)')
    .order('game_date', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching daily stocks:', error)
    return
  }

  console.log('--- Daily Stocks (Recent 20) ---')
  data.forEach(row => {
    console.log(`${row.game_date}: ${row.stocks?.name} (ID: ${row.id})`)
  })

  // Check batch execution logs
  const { data: logs, error: logError } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5)

  if (logError) {
    console.error('Error fetching logs:', logError)
  } else {
    console.log('\n--- Batch Execution Logs (Recent 5) ---')
    logs.forEach(log => {
      console.log(`${log.started_at}: ${log.function_name} - ${log.status} (${log.message})`)
    })
  }
}

checkDailyStocks()
