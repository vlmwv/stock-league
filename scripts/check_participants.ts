import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('*, profiles(username)')
    .gte('game_date', '2026-04-01')
    .order('game_date', { ascending: false })
  
  if (error) {
    console.error(error)
    return
  }

  console.log('Predictions found:', predictions.length)
  const byDate = {}
  predictions.forEach(p => {
    if (!byDate[p.game_date]) byDate[p.game_date] = new Set()
    byDate[p.game_date].add(p.user_id + ' (' + (p.profiles?.username || 'unknown') + ')')
  })

  for (const date in byDate) {
    console.log(`Date: ${date}, Participants: ${byDate[date].size}`)
    byDate[date].forEach(u => console.log(`  - ${u}`))
  }
}

check()
