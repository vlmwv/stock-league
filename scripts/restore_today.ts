import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY as string
const supabase = createClient(supabaseUrl, supabaseKey)

async function restoreToday() {
  // 오늘 KST 날짜
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
  
  console.log(`Checking data for today: ${today}`)
  
  // 이미 오늘 데이터가 있는지 확인
  const { count } = await supabase
    .from('daily_stocks')
    .select('*', { count: 'exact', head: true })
    .eq('game_date', today)
  
  if ((count || 0) > 0) {
    console.log(`오늘(${today}) 데이터가 이미 ${count}개 존재합니다. 종료.`)
    return
  }
  
  // 04-03의 종목들을 오늘 날짜로 복사 (가장 최근 영업일의 종목을 재사용)
  const { data: latestDailyStocks, error } = await supabase
    .from('daily_stocks')
    .select('stock_id, llm_summary')
    .order('game_date', { ascending: false })
    .limit(5)
  
  if (error || !latestDailyStocks || latestDailyStocks.length === 0) {
    console.error('최신 종목 조회 실패:', error)
    return
  }
  
  // 중복 stock_id 제거 (가장 최근 것 우선)
  const seen = new Set<number>()
  const uniqueStocks = latestDailyStocks.filter(ds => {
    if (seen.has(ds.stock_id)) return false
    seen.add(ds.stock_id)
    return true
  }).slice(0, 5)
  
  console.log(`오늘(${today}) 데이터 생성 시작. 사용할 종목:`, uniqueStocks.map(s => s.stock_id))
  
  for (const stock of uniqueStocks) {
    const { error: insertError } = await supabase
      .from('daily_stocks')
      .insert({
        stock_id: stock.stock_id,
        game_date: today,
        llm_summary: stock.llm_summary,
        status: 'completed'
      })
    
    if (insertError) {
      // unique violation이면 이미 있는 것이므로 무시
      if (insertError.code === '23505') {
        console.log(`stock_id=${stock.stock_id} 이미 존재, 건너뜀`)
      } else {
        console.error(`stock_id=${stock.stock_id} 삽입 실패:`, insertError)
      }
    } else {
      console.log(`stock_id=${stock.stock_id} 삽입 성공`)
    }
  }
  
  console.log('완료!')
}

restoreToday()
