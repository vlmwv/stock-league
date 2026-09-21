import { createClient } from '@supabase/supabase-js'
import { isAuthorizedBatchCall, unauthorizedResponse } from '../_shared/auth.ts'

// 환경 변수 설정
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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
  const data = await res.json()
  return data.stocks || []
}

Deno.serve(async (req) => {
  // 인가: cron/서버(service_role)만 호출할 수 있다. verify_jwt만으로는 anon 키 호출이 통과된다.
  if (!isAuthorizedBatchCall(req)) return unauthorizedResponse()

  const startTime = new Date().toISOString()
  let logEntryId: string | null = null

  try {
    console.log('Fetching KRX Top 100 stocks triggered...')

    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'update-krx-top-100',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    
    if (logEntry) logEntryId = logEntry.id

    // 1. KOSPI & KOSDAQ 상위 100종목 가져오기
    const [kospiStocks, kosdaqStocks] = await Promise.all([
      fetchNaverTop100('KOSPI'),
      fetchNaverTop100('KOSDAQ')
    ])

    const allStocks = [...kospiStocks, ...kosdaqStocks]

    // 2. 통합 후 시가총액(marketValue, 단위 억원) 기준으로 내림차순 정렬
    allStocks.sort((a, b) => {
      const valA = parseInt((a.marketValue || '0').replace(/,/g, ''))
      const valB = parseInt((b.marketValue || '0').replace(/,/g, ''))
      return valB - valA
    })

    // 3. 상위 100개 추출
    const top100 = allStocks.slice(0, 100)
    console.log(`Successfully fetched and sorted ${top100.length} stocks.`)

    // 4. DB 업데이트를 위한 데이터 매핑
    const records = top100.map((item, index) => {
      return {
        code: item.itemCode,
        name: item.stockName,
        market_cap_rank: index + 1,
        last_price: parseInt((item.closePrice || '0').replace(/,/g, '')),
        change_amount: parseInt((item.compareToPreviousClosePrice || '0').replace(/,/g, '')),
        change_rate: parseFloat((item.fluctuationsRatio || '0')),
        market_cap: parseInt((item.marketValue || '0').replace(/,/g, '')),
        updated_at: new Date().toISOString()
      }
    })

    // 5. 새로운 Top 100 종목 Upsert (code 컬럼 기준)
    // 순위 소실 방지: 먼저 신규 순위를 반영한 뒤(6단계) 밀려난 종목만 초기화한다.
    // (기존에는 전체 rank를 NULL로 리셋한 직후 upsert가 실패하면 모든 순위가 사라졌다.)
    const { error: upsertError } = await supabase
      .from('stocks')
      .upsert(records, { onConflict: 'code' })

    if (upsertError) {
      console.error('Failed to upsert stocks:', upsertError)
      throw upsertError
    }

    // 6. Top 100에서 밀려난 기존 종목의 market_cap_rank만 초기화
    const topCodes = records.map(r => r.code)
    const { error: resetError } = await supabase
      .from('stocks')
      .update({ market_cap_rank: null })
      .not('market_cap_rank', 'is', null)
      .not('code', 'in', `(${topCodes.join(',')})`)

    if (resetError) {
      console.error('Failed to reset market_cap_rank:', resetError)
      throw resetError
    }

    // 로그 종료 기록
    if (logEntryId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: records.length,
          message: `Successfully updated KRX Top 100 stocks`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    }

    return new Response(JSON.stringify({
      message: 'Successfully updated KRX Top 100 stocks',
      count: records.length
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('Fatal Edge Function Error:', err.message)
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
          function_name: 'update-krx-top-100',
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
