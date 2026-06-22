import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLogs() {
  const { data, error } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching logs:', error)
  } else {
    console.log('Recent batch execution logs:')
    console.log(JSON.stringify(data, null, 2))
  }
}

checkLogs()
