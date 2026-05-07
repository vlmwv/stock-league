
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://zmqjooidmibqrigziipq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.Drda7pthX3fbl1liUwzGEKz-3gpHqChzNS8cefiHyt0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function updateSamsung() {
  console.log('Fetching Samsung Electronics data from Naver...')
  const res = await fetch('https://polling.finance.naver.com/api/realtime/domestic/stock/005930')
  const data = await res.json()
  const samsung = data.datas[0]
  
  if (!samsung) {
    console.error('Samsung data not found')
    return
  }
  
  // marketValueFullRaw is in KRW. Convert to '억' (100M KRW)
  const marketCapRaw = parseInt(samsung.marketValueFullRaw, 10)
  const marketCapEok = Math.floor(marketCapRaw / 100000000)
  
  console.log(`Samsung Electronics Market Cap: ${marketCapEok} 억`)
  
  const { error } = await supabase
    .from('stocks')
    .update({ market_cap: marketCapEok })
    .eq('code', '005930')
  
  if (error) {
    console.error('Error updating DB:', error)
  } else {
    console.log('Successfully updated Samsung Electronics market cap!')
  }
}

updateSamsung()
