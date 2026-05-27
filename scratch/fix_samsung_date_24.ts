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

async function fix24() {
  console.log('--- DB Data Correction for Samsung Electronics (3/24 Recommendation) ---')

  // 1. 3/23 종가: 186,300원 -> 78,500원
  const { error: err1 } = await supabase
    .from('stock_price_history')
    .update({ close_price: 78500 })
    .eq('stock_id', 1)
    .eq('price_date', '2026-03-23')

  if (err1) {
    console.error('Error updating 3/23 price history:', err1)
  } else {
    console.log('Successfully corrected 3/23 close_price to 78,500원!')
  }

  // 2. 3/24 종가: 189,700원 -> 79,000원
  const { error: err2 } = await supabase
    .from('stock_price_history')
    .update({ close_price: 79000 })
    .eq('stock_id', 1)
    .eq('price_date', '2026-03-24')

  if (err2) {
    console.error('Error updating 3/24 price history:', err2)
  } else {
    console.log('Successfully corrected 3/24 close_price to 79,000원!')
  }

  console.log('--- 3/24 DB Data Correction Completed ---')
}

fix24()
