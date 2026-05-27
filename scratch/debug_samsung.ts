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

async function debug() {
  console.log('--- Debugging 3/19 Samsung Electronics ---')

  // 1. 3/19 추천 데이터 조회
  const { data, error } = await supabase
    .from('daily_stocks')
    .select(`
      id,
      game_date,
      created_at,
      stocks (
        id,
        name,
        code,
        last_price
      )
    `)
    .eq('game_date', '2026-03-19')

  if (error) {
    console.error('Error daily_stocks:', error)
    return
  }

  console.log('Daily stocks on 3/19:', JSON.stringify(data, null, 2))

  const stockIds = (data || []).map((ds: any) => ds.stocks?.id).filter(Boolean)
  const gameDates = (data || []).map((ds: any) => ds.game_date).filter(Boolean)

  console.log('stockIds:', stockIds)
  console.log('gameDates:', gameDates)

  // 2. price history 조회 날짜 구하기
  const minDate = new Date(Math.min(...gameDates.map((d: string) => new Date(d).getTime())))
  const searchStartDate = new Date(minDate)
  searchStartDate.setDate(searchStartDate.getDate() - 10) 
  const searchStartDateStr = searchStartDate.toISOString().split('T')[0]

  console.log('searchStartDateStr:', searchStartDateStr)

  // 3. stock_price_history 조회
  const { data: hpData, error: hpError } = await supabase
    .from('stock_price_history')
    .select('stock_id, price_date, close_price')
    .in('stock_id', stockIds)
    .gte('price_date', searchStartDateStr)
    .order('price_date', { ascending: false })

  if (hpError) {
    console.error('Error hpData:', hpError)
    return
  }

  console.log(`Fetched ${hpData?.length} history price records`)

  // 삼성전자(stock_id = 1)의 history 기록만 따로 출력
  const samsungHp = hpData?.filter(hp => Number(hp.stock_id) === 1)
  console.log('Samsung Electronics History Prices:', samsungHp)

  // 4. fetchAiHistoryMonthly 의 매칭 시뮬레이션
  const samsungDs = data?.find((ds: any) => ds.stocks?.id === 1)
  if (samsungDs) {
    const recPriceRecord = hpData.find(hp => 
      Number(hp.stock_id) === Number(samsungDs.stocks.id) && hp.price_date < samsungDs.game_date
    )
    const sameDayRecord = hpData.find(hp => 
      Number(hp.stock_id) === Number(samsungDs.stocks.id) && hp.price_date === samsungDs.game_date
    )
    
    console.log('Match Simulation:')
    console.log('- recPriceRecord:', recPriceRecord)
    console.log('- sameDayRecord:', sameDayRecord)
    console.log('- fallback (stocks.last_price):', samsungDs.stocks.last_price)
    
    const recPrice = recPriceRecord?.close_price || sameDayRecord?.close_price || samsungDs.stocks.last_price || 0
    console.log('- Final recPrice:', recPrice)
  }
}

debug()
