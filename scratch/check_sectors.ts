
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStocks() {
  const { data, error } = await supabase
    .from('stocks')
    .select('name, sector')
    .limit(20)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Stocks and Sectors:')
  data.forEach(s => {
    console.log(`${s.name}: ${s.sector}`)
  })
}

checkStocks()
