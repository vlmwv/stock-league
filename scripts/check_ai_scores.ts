
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
  console.log('--- Latest Daily Stocks ---')
  const { data: dailyStocks, error: dsError } = await supabase
    .from('daily_stocks')
    .select('id, game_date, ai_score, llm_summary, stocks(name)')
    .order('game_date', { ascending: false })
    .limit(10)

  if (dsError) {
    console.error('Error fetching daily_stocks:', dsError)
  } else {
    console.table(dailyStocks.map(item => ({
      id: item.id,
      date: item.game_date,
      name: item.stocks?.name,
      ai_score: item.ai_score,
      summary: item.llm_summary
    })))
  }

  console.log('\n--- select-daily-stocks Execution Logs ---')
  const { data: logs, error: logError } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .eq('function_name', 'select-daily-stocks')
    .order('started_at', { ascending: false })
    .limit(5)
  
  if (logError) {
    console.error('Error fetching logs:', logError)
  } else {
    console.table(logs.map(log => ({
        id: log.id,
        status: log.status,
        started: log.started_at,
        finished: log.finished_at,
        processed: log.processed_count,
        message: log.message
    })))
  }
}

check()
