import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  const startTime = new Date().toISOString()
  let logEntryId: string | null = null

  try {
    console.log('Fetching top stocks data from Naver...')

    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'update-krx-stocks',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    
    if (logEntry) logEntryId = logEntry.id

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

    // 맵을 사용하여 중복 방지 및 시장 정보 유지
    const stockMap = new Map()

    if (kospiData.stocks) {
      kospiData.stocks.forEach((s: any) => {
        stockMap.set(s.itemCode, { ...s, _sector: 'KOSPI' })
      })
    }
    if (kosdaqData.stocks) {
      kosdaqData.stocks.forEach((s: any) => {
        stockMap.set(s.itemCode, { ...s, _sector: 'KOSDAQ' })
      })
    }

    const allStocks = Array.from(stockMap.values())

    // Sort by marketValue descending to assign market_cap_rank
    allStocks.sort((a: any, b: any) => {
      const aVal = parseInt(a.marketValue.replace(/,/g, ''), 10) || 0
      const bVal = parseInt(b.marketValue.replace(/,/g, ''), 10) || 0
      return bVal - aVal
    })

    console.log(`Processing ${allStocks.length} stocks...`)

    const upsertData = allStocks.map((item: any, index: number) => {
      return {
        code: item.itemCode,
        name: item.stockName,
        sector: item._sector,
        last_price: parseInt(item.closePrice.replace(/,/g, ''), 10),
        change_amount: parseInt(item.compareToPreviousClosePrice.replace(/,/g, ''), 10),
        change_rate: parseFloat(item.fluctuationsRatio),
        // 거래총액(거래대금)을 volume 컬럼에 저장 (사용자 혼동 방지)
        volume: parseInt(item.accumulatedTradingValueRaw, 10),
        market_cap_rank: index + 1,
        updated_at: new Date().toISOString(),
      }
    })

    // Supabase에 Upsert (code 기준)
    const { error } = await supabase
      .from('stocks')
      .upsert(upsertData, { onConflict: 'code' })

    if (error) throw error

    // 로그 종료 기록
    if (logEntryId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: upsertData.length,
          message: `Successfully updated top ${upsertData.length} stocks from Naver`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    }

    return new Response(JSON.stringify({ message: 'Successfully updated top 100 stocks from Naver', count: upsertData.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('Error updating stocks:', err.message)
    if (logEntryId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    } else {
      await supabase
        .from('batch_execution_logs')
        .insert({
          function_name: 'update-krx-stocks',
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
    }

    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
