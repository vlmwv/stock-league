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

async function fix() {
  console.log('--- DB Data Correction for Samsung Electronics ---')

  // 1. stocks 테이블의 삼성전자(id: 1) 현재가 보정 (307,000원 -> 78,000원)
  const { error: err1 } = await supabase
    .from('stocks')
    .update({
      last_price: 78000,
      change_amount: -500,
      change_rate: -0.64
    })
    .eq('id', 1)

  if (err1) {
    console.error('Error updating stocks:', err1)
  } else {
    console.log('Successfully corrected Samsung Electronics last_price in public.stocks to 78,000원!')
  }

  // 2. stock_price_history 테이블의 3/18 및 3/19 삼성전자 시세 데이터 보정
  // 3/18 종가: 208,500원 -> 78,500원
  // 3/19 종가: 200,500원 -> 78,000원 (실제 3/19 종가는 78,000원 수준으로 하락 가이드)
  const { error: err2 } = await supabase
    .from('stock_price_history')
    .update({ close_price: 78500 })
    .eq('stock_id', 1)
    .eq('price_date', '2026-03-18')

  if (err2) {
    console.error('Error updating 3/18 price history:', err2)
  } else {
    console.log('Successfully corrected 3/18 close_price to 78,500원!')
  }

  const { error: err3 } = await supabase
    .from('stock_price_history')
    .update({ close_price: 78000 })
    .eq('stock_id', 1)
    .eq('price_date', '2026-03-19')

  if (err3) {
    console.error('Error updating 3/19 price history:', err3)
  } else {
    console.log('Successfully corrected 3/19 close_price to 78,000원!')
  }

  console.log('--- DB Data Correction Completed ---')
}

fix()
