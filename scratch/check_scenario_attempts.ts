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
  console.log('Fetching all scenario_attempts...')
  const { data, error } = await supabase
    .from('scenario_attempts')
    .select('*')
    .order('completed_at', { ascending: false })
  
  if (error) {
    console.error('Error scenario_attempts:', error)
  } else {
    console.table(data)
  }
}

check()
