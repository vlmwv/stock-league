
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey!)

async function restore() {
  const today = '2026-04-06'
  console.log(`Checking if data for ${today} exists...`)

  const { count } = await supabase
    .from('daily_stocks')
    .select('*', { count: 'exact', head: true })
    .eq('game_date', today)

  if (count && count >= 5) {
    console.log(`Data for ${today} already exists. Skipping.`)
    return
  }

  console.log(`Restoring data for ${today}...`)
  
  // 시총 상위 5개 가져오기
  const { data: topStocks } = await supabase
    .from('stocks')
    .select('id, name')
    .order('market_cap_rank', { ascending: true })
    .limit(5)

  if (!topStocks || topStocks.length < 5) {
    console.error('Could not find enough stocks to restore.')
    return
  }

  const dailyEntries = topStocks.map(s => ({
    stock_id: s.id,
    game_date: today,
    llm_summary: `${s.name}의 주가 흐름을 분석 중입니다. 기본 종목으로 생성되었습니다.`,
    ai_score: 50,
    status: 'pending'
  }))

  const { error } = await supabase.from('daily_stocks').insert(dailyEntries)
  
  if (error) {
    console.error('Failed to restore:', error.message)
  } else {
    console.log(`Successfully restored 5 stocks for ${today}.`)
  }
}

restore()
