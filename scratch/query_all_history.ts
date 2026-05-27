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

async function run() {
  console.log('Querying stock price history for 2026-05-27...')
  const { data: history, error: historyError } = await supabase
    .from('stock_price_history')
    .select(`
      id,
      stock_id,
      price_date,
      open_price,
      high_price,
      low_price,
      close_price,
      change_amount,
      change_rate,
      volume,
      stocks (
        id,
        code,
        name
      )
    `)
    .eq('price_date', '2026-05-27')
    .limit(50)
  
  if (historyError) {
    console.error('Error:', historyError)
  } else {
    console.log('Price history records with stock names:')
    history?.forEach((h: any) => {
      console.log(`Stock: ${h.stocks?.name} (ID: ${h.stock_id}, Code: ${h.stocks?.code}) -> Close: ${h.close_price}, Open: ${h.open_price}, High: ${h.high_price}, Low: ${h.low_price}`)
    })
  }
}

run()
