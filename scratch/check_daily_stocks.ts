import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
      .from('daily_stocks')
      .select(`
        id,
        game_date,
        target_price,
        target_date,
        stocks (
          id,
          code,
          name
        )
      `)
      .not('target_price', 'is', null)
      .order('game_date', { ascending: false })
      .limit(5)

  console.log("Error:", error)
  console.log("Data:", JSON.stringify(data, null, 2))
}
check()
