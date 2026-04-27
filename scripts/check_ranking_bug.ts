
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
  console.log('Checking specific stocks...')
  const { data, error } = await supabase
    .from('stocks')
    .select('name, code, sector, volume, last_price')
    .in('name', ['대한전선', '삼성전자', '에코프로'])
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.table(data)
  }

  console.log('\nTop 10 by volume (Total):')
  const { data: topAll } = await supabase
    .from('stocks')
    .select('name, sector, volume')
    .order('volume', { ascending: false })
    .limit(10)
  console.table(topAll)

  console.log('\nTop 10 by volume (KOSPI):')
  const { data: topKospi } = await supabase
    .from('stocks')
    .select('name, sector, volume')
    .eq('sector', 'KOSPI')
    .order('volume', { ascending: false })
    .limit(10)
  console.table(topKospi)
}

check()
