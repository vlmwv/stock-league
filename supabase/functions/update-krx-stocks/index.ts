import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    console.log('Fetching top stocks data from Naver...')

    // Fetch top 100 KOSPI and KOSDAQ
    const [kospiRes, kosdaqRes] = await Promise.all([
      fetch('https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=100'),
      fetch('https://m.stock.naver.com/api/stocks/marketValue/KOSDAQ?page=1&pageSize=100')
    ])

    if (!kospiRes.ok || !kosdaqRes.ok) {
      throw new Error(`Naver API response error`)
    }

    const kospiData = await kospiRes.json()
    const kosdaqData = await kosdaqRes.json()

    const allStocks = [...(kospiData.stocks || []), ...(kosdaqData.stocks || [])]

    // Sort by marketValue descending and take top 100
    const top100 = allStocks
      .sort((a: any, b: any) => {
        const aVal = parseInt(a.marketValue.replace(/,/g, ''), 10) || 0
        const bVal = parseInt(b.marketValue.replace(/,/g, ''), 10) || 0
        return bVal - aVal
      })
      .slice(0, 100)

    console.log(`Processing ${top100.length} stocks...`)

    const upsertData = top100.map((item: any, index: number) => {
      const isKospi = item.stockExchangeType?.name === 'KOSPI'
      return {
        code: item.itemCode,
        name: item.stockName,
        sector: isKospi ? 'KOSPI' : 'KOSDAQ',
        last_price: parseInt(item.closePrice.replace(/,/g, ''), 10),
        change_amount: parseInt(item.compareToPreviousClosePrice.replace(/,/g, ''), 10),
        change_rate: parseFloat(item.fluctuationsRatio),
        market_cap_rank: index + 1,
        updated_at: new Date().toISOString(),
      }
    })

    // Supabase에 Upsert (code 기준)
    const { error } = await supabase
      .from('stocks')
      .upsert(upsertData, { onConflict: 'code' })

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Successfully updated top 100 stocks from Naver', count: upsertData.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('Error updating stocks:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
