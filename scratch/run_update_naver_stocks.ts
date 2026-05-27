import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function testUpdate() {
  console.log('Fetching Samsung Electronics current DB values...')
  const { data: beforeStock } = await supabase.from('stocks').select('*').eq('code', '005930').single()
  console.log('Before stock:', beforeStock)
  
  const codes = '005930'
  const naverApiUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${codes}`
  console.log(`Fetching from Naver: ${naverApiUrl}`)
  
  const response = await fetch(naverApiUrl)
  const responseData = (await response.json()) as any
  
  const fresh = responseData.datas[0]
  const closePrice = parseInt(fresh.closePriceRaw, 10)
  console.log(`Fresh closePrice from API: ${closePrice} (${typeof closePrice})`)
  
  const updatePayload = {
    last_price: closePrice,
    change_amount: parseInt(fresh.compareToPreviousClosePriceRaw, 10),
    change_rate: parseFloat(fresh.fluctuationsRatioRaw),
    volume: parseInt(fresh.accumulatedTradingValueRaw, 10),
    updated_at: new Date().toISOString()
  }
  console.log('Update payload:', updatePayload)
  
  console.log('Executing update on stocks table for Samsung Electronics...')
  const { error: updateError, data: updateResult } = await supabase
    .from('stocks')
    .update(updatePayload)
    .eq('code', '005930')
    .select()
    
  if (updateError) {
    console.error('Update failed with error:', updateError)
  } else {
    console.log('Update succeeded. Return data:', updateResult)
  }
  
  const { data: afterStock } = await supabase.from('stocks').select('*').eq('code', '005930').single()
  console.log('After stock:', afterStock)
}

testUpdate()
