
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkData() {
  const { data, error } = await supabase
    .from('daily_stocks')
    .select('id, game_date, ai_result, status')
    .order('game_date', { ascending: false })
    .limit(20)

  if (error) {
    console.error(error)
    return
  }

  console.log('--- Recent Daily Stocks ---')
  console.table(data)

  const { count: pendingCount } = await supabase
    .from('daily_stocks')
    .select('*', { count: 'exact', head: true })
    .eq('ai_result', 'pending')
    .lte('game_date', new Date().toISOString().split('T')[0])

  console.log(`\nPending daily_stocks on or before today: ${pendingCount}`)
}

checkData()
