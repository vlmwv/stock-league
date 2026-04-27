import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://zmqjooidmibqrigziipq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.Drda7pthX3fbl1liUwzGEKz-3gpHqChzNS8cefiHyt0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function getStocksWithTargets() {
  const { data, error } = await supabase
    .from('daily_stocks')
    .select(`
      target_price,
      target_date,
      game_date,
      stocks (
        name,
        code
      )
    `)
    .not('target_price', 'is', null)
    .not('target_date', 'is', null)
    .order('game_date', { ascending: false })

  if (error) {
    console.error('Error fetching stocks:', error)
    return
  }

  if (data.length === 0) {
    console.log('목표가와 목표기준일이 있는 종목이 없습니다.')
    return
  }

  console.log('목표가와 목표기준일이 있는 종목 리스트:')
  data.forEach(item => {
    console.log(`- ${item.stocks.name} (${item.stocks.code}): 목표가 ${item.target_price}원, 목표기준일 ${item.target_date} (추천일: ${item.game_date})`)
  })
}

getStocksWithTargets()
