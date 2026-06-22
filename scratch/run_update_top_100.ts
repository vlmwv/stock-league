import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchNaverTop100(category: 'KOSPI' | 'KOSDAQ') {
  const url = `https://m.stock.naver.com/api/stocks/marketValue/${category}?page=1&pageSize=100`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${category} top 100`)
  }
  const data = (await res.json()) as any
  return data.stocks || []
}

async function runUpdate() {
  console.log('Fetching KRX Top 100 stocks manually...')

  const [kospiStocks, kosdaqStocks] = await Promise.all([
    fetchNaverTop100('KOSPI'),
    fetchNaverTop100('KOSDAQ')
  ])

  const allStocks = [...kospiStocks, ...kosdaqStocks]

  // 시가총액(marketValue) 기준으로 내림차순 정렬
  allStocks.sort((a, b) => {
    const valA = parseInt((a.marketValue || '0').replace(/,/g, ''))
    const valB = parseInt((b.marketValue || '0').replace(/,/g, ''))
    return valB - valA
  })

  const top100 = allStocks.slice(0, 100)
  console.log(`Sorted top 100 stocks. SK하이닉스 marketValue=${top100[0].marketValue}, 삼성전자 marketValue=${top100[1].marketValue}`)

  const records = top100.map((item, index) => {
    return {
      code: item.itemCode,
      name: item.stockName,
      market_cap_rank: index + 1,
      last_price: parseInt((item.closePrice || '0').replace(/,/g, '')),
      change_amount: parseInt((item.compareToPreviousClosePrice || '0').replace(/,/g, '')),
      change_rate: parseFloat((item.fluctuationsRatio || '0')),
      market_cap: Math.round(parseInt((item.marketValue || '0').replace(/,/g, ''), 10) / 10) || 0,
      updated_at: new Date().toISOString()
    }
  })

  // 1. 기존의 market_cap_rank 초기화
  console.log('Resetting old ranks...')
  const { error: resetError } = await supabase
    .from('stocks')
    .update({ market_cap_rank: null })
    .neq('id', 0)

  if (resetError) {
    console.error('Reset error:', resetError)
    return
  }

  // 2. 새로운 Top 100 Upsert
  console.log('Upserting top 100 records...')
  const { error: upsertError } = await supabase
    .from('stocks')
    .upsert(records, { onConflict: 'code' })

  if (upsertError) {
    console.error('Upsert error:', upsertError)
    return
  }

  console.log('Update completed successfully!')
}

runUpdate()
