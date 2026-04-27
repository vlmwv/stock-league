
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Missing Supabase environment variables (NUXT_PUBLIC_SUPABASE_URL, NUXT_SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function fetchNaverStocks(market: 'KOSPI' | 'KOSDAQ', page: number = 1) {
  const url = `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=100`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${market} page ${page}`)
  const data = await res.json()
  return data.stocks || []
}

async function fixData() {
  console.log('Starting data fix for stocks...')
  
  const allNaverStocks: any[] = []
  
  // 1. 코스피/코스닥 상위 200개씩 가져오기 (충분한 범위를 커버하기 위해)
  for (const market of ['KOSPI', 'KOSDAQ'] as const) {
    for (let page = 1; page <= 2; page++) {
      console.log(`Fetching ${market} page ${page}...`)
      const stocks = await fetchNaverStocks(market, page)
      stocks.forEach((s: any) => {
        allNaverStocks.push({
          code: s.itemCode,
          name: s.stockName,
          sector: market,
          volume: parseInt(s.accumulatedTradingValueRaw, 10),
          last_price: parseInt(s.closePrice.replace(/,/g, ''), 10),
          change_amount: parseInt(s.compareToPreviousClosePrice.replace(/,/g, ''), 10),
          change_rate: parseFloat(s.fluctuationsRatio)
        })
      })
    }
  }

  console.log(`Fetched ${allNaverStocks.length} stocks from Naver. Updating database...`)

  // 2. DB 업데이트 (10개씩 묶어서 처리)
  const chunkSize = 10
  for (let i = 0; i < allNaverStocks.length; i += chunkSize) {
    const chunk = allNaverStocks.slice(i, i + chunkSize)
    const promises = chunk.map(s => 
      supabase
        .from('stocks')
        .update({
          sector: s.sector,
          volume: s.volume,
          last_price: s.last_price,
          change_amount: s.change_amount,
          change_rate: s.change_rate,
          updated_at: new Date().toISOString()
        })
        .eq('code', s.code)
    )
    
    await Promise.all(promises)
    console.log(`Updated chunk ${i / chunkSize + 1}/${Math.ceil(allNaverStocks.length / chunkSize)}`)
  }

  console.log('Data fix completed successfully.')
}

fixData().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
