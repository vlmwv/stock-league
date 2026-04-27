
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStocks() {
  const { data, error } = await supabase
    .from('stocks')
    .select('name, code, sector, volume, last_price')
    .in('name', ['대한전선', '삼성전자', '에코프로'])
    .order('volume', { ascending: false })

  if (error) {
    console.error('Error fetching stocks:', error)
    return
  }

  console.log('Stock Data:')
  console.table(data)

  // Top 10 by volume
  const { data: topVolume, error: volError } = await supabase
    .from('stocks')
    .select('name, code, sector, volume')
    .order('volume', { ascending: false })
    .limit(10)

  if (volError) {
    console.error('Error fetching top volume stocks:', volError)
    return
  }

  console.log('\nTop 10 Volume (Overall):')
  console.table(topVolume)

  // Top 1 by volume in KOSPI
  const { data: topKospi, error: kospiError } = await supabase
    .from('stocks')
    .select('name, code, sector, volume')
    .eq('sector', 'KOSPI')
    .order('volume', { ascending: false })
    .limit(5)

  console.log('\nTop 5 Volume (KOSPI):')
  console.table(topKospi)

  // Top 1 by volume in KOSDAQ
  const { data: topKosdaq, error: kosdaqError } = await supabase
    .from('stocks')
    .select('name, code, sector, volume')
    .eq('sector', 'KOSDAQ')
    .order('volume', { ascending: false })
    .limit(5)

  console.log('\nTop 5 Volume (KOSDAQ):')
  console.table(topKosdaq)
}

checkStocks()
