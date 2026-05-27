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

async function run() {
  console.log('Querying batch execution logs...')
  const { data: logs, error } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching logs:', error)
  } else {
    console.log('Latest batch execution logs:')
    logs?.forEach((l: any) => {
      console.log(`ID: ${l.id}, Function: ${l.function_name}, Status: ${l.status}, Started: ${l.started_at}, Finished: ${l.finished_at}, Count: ${l.processed_count}, Msg: ${l.message}`)
    })
  }
}

run()
