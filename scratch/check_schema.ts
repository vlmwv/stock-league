import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.rpc('get_columns', { table_name: 'ai_analysis_logs' })
  // If rpc doesn't exist, we can try to insert a dummy row and see the error.
  const { error: insertErr } = await supabase.from('ai_analysis_logs').insert({ asdf: 123 })
  console.log("Insert Error:", insertErr)
}
check()
