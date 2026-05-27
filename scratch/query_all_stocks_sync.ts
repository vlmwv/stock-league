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
  console.log('Querying all stocks and their history for 2026-05-27 to check sync...')
  
  // 1. stocks 테이블에서 모든 종목 조회
  const { data: stocks, error: stocksError } = await supabase
    .from('stocks')
    .select('id, code, name, last_price')
    
  if (stocksError) {
    console.error('Error fetching stocks:', stocksError)
    return
  }
  
  // 2. 2026-05-27 stock_price_history 테이블 조회
  const { data: history, error: historyError } = await supabase
    .from('stock_price_history')
    .select('stock_id, close_price, change_amount, change_rate, volume')
    .eq('price_date', '2026-05-27')
    
  if (historyError) {
    console.error('Error fetching history:', historyError)
    return
  }
  
  console.log(`Fetched ${stocks?.length} stocks and ${history?.length} history records.`)
  
  const historyMap = new Map(history?.map(h => [h.stock_id, h]))
  let mismatchCount = 0
  
  for (const stock of stocks || []) {
    const hist = historyMap.get(stock.id)
    if (!hist) {
      console.log(`Stock: ${stock.name} (${stock.code}) has no history on 2026-05-27.`)
      continue
    }
    
    if (stock.last_price !== hist.close_price) {
      mismatchCount++
      console.log(`[MISMATCH] Stock: ${stock.name} (${stock.code}) -> stocks.last_price: ${stock.last_price} vs history.close_price: ${hist.close_price}`)
      
      // 일치하지 않는 경우, 안 1(네이버 API 원본 시세 유지)에 따라 stocks 테이블의 가격을 history 테이블의 최신 가격으로 강제 업데이트합니다.
      console.log(`Updating stocks.last_price to ${hist.close_price} for ${stock.name}...`)
      const { error: updateError } = await supabase
        .from('stocks')
        .update({
          last_price: hist.close_price,
          change_amount: hist.change_amount,
          change_rate: hist.change_rate,
          volume: hist.volume,
          updated_at: new Date().toISOString()
        })
        .eq('id', stock.id)
        
      if (updateError) {
        console.error(`Failed to update ${stock.name}:`, updateError)
      } else {
        console.log(`Successfully synced ${stock.name}!`)
      }
    }
  }
  
  console.log(`\nSync process completed. Total mismatched stocks fixed: ${mismatchCount}`)
}

run()
