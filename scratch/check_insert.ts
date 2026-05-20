import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('ai_analysis_logs').insert({
      stock_code: '000000',
      stock_name: 'Test',
      game_date: '2026-05-11',
      prompt: 'Test prompt',
      response_raw: { test: true },
      ai_score: 50
  })
  console.log("Error:", error)
}
run()
