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

async function debugAll() {
  console.log('--- Simulating Samsung Electronics monthly matching logic ---')

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
    .eq('stock_id', 1) // 삼성전자 전체 추천 이력
    .order('game_date', { ascending: true })

  if (error) {
    console.error('Error fetching daily_stocks:', error)
    return
  }

  console.log(`Samsung Electronics recommended for ${data?.length} days in total`)

  const stockIds = [1]
  const gameDates = (data || []).map((ds: any) => ds.game_date).filter(Boolean)

  const minDate = new Date(Math.min(...gameDates.map((d: string) => {
    const parts = d.split('-')
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime()
  })))
  const searchStartDate = new Date(minDate)
  searchStartDate.setDate(searchStartDate.getDate() - 10) 
  const searchStartDateStr = searchStartDate.toISOString().split('T')[0]

  const { data: hpData } = await supabase
    .from('stock_price_history')
    .select('stock_id, price_date, close_price')
    .eq('stock_id', 1)
    .gte('price_date', searchStartDateStr)
    .order('price_date', { ascending: false })

  const historyPrices = hpData || []

  data?.forEach((ds: any) => {
    const recPriceRecord = historyPrices.find(hp => 
      Number(hp.stock_id) === Number(ds.stocks.id) && hp.price_date < ds.game_date
    )
    const sameDayRecord = historyPrices.find(hp => 
      Number(hp.stock_id) === Number(ds.stocks.id) && hp.price_date === ds.game_date
    )
    
    const recPrice = recPriceRecord?.close_price || sameDayRecord?.close_price || ds.stocks.last_price || 0
    const currentPrice = ds.stocks.last_price || 0
    
    let cumulativeChangeRate = 0
    if (recPrice > 0) {
      cumulativeChangeRate = Number(((currentPrice - recPrice) / recPrice * 100).toFixed(2))
    }

    console.log(`[Date: ${ds.game_date}] recPrice: ${recPrice} -> currentPrice: ${currentPrice} | cumulativeChangeRate: ${cumulativeChangeRate}%`)
  })
}

debugAll()
