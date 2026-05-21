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

async function check() {
  const { data, error } = await supabase
    .from('stocks')
    .select('id, name, code, sector, market_cap_rank')
    .order('market_cap_rank', { ascending: true })
    .limit(30)

  if (error) {
    console.error('Error fetching stocks:', error)
  } else {
    console.log('Top 30 stocks in DB:')
    data.forEach(s => {
      console.log(`- ${s.name} (${s.code}): sector=${s.sector}, rank=${s.market_cap_rank}`)
    })
  }
}

check()
