import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Cleaning up pending target_price items...")
  const { data: del, error: errDel } = await supabase
      .from('daily_stocks')
      .delete()
      .is('target_price', null)
      .eq('status', 'pending')
  
  console.log("Delete result:", errDel || "Success")

  console.log("Triggering Edge Function via direct HTTP request...")
  // Trigger edge function
  const functionUrl = `${supabaseUrl}/functions/v1/select-daily-stocks`
  const res = await fetch(functionUrl, {
     method: 'POST',
     headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
     }
  })
  
  console.log("Function status:", res.status)
  console.log("Function output:", await res.text())

  console.log("Checking DB for new entries...")
  const { data, error } = await supabase
      .from('daily_stocks')
      .select('game_date, target_price, ai_score')
      .order('created_at', { ascending: false })
      .limit(5)

  console.log("New entries:", JSON.stringify(data, null, 2))
}
run()
