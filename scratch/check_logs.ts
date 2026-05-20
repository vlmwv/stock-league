import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
      .from('ai_analysis_logs')
      .select('stock_name, prompt, response_raw')
      .order('created_at', { ascending: false })
      .limit(5)
  console.log("Error:", error)
  console.log("Data:", JSON.stringify(data, null, 2))
}
run()
