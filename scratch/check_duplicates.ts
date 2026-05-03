import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
  const { data, error } = await supabase.rpc('get_duplicate_daily_stocks')
  
  if (error) {
    // If RPC doesn't exist, try manual query
    console.log('RPC not found, trying manual query...')
    const { data: allData, error: allErr } = await supabase
      .from('daily_stocks')
      .select('stock_id, game_date')
    
    if (allErr) {
      console.error('Error:', allErr)
      return
    }

    const counts: Record<string, number> = {}
    allData.forEach((row: any) => {
      const key = `${row.stock_id}_${row.game_date}`
      counts[key] = (counts[key] || 0) + 1
    })

    const duplicates = Object.entries(counts).filter(([key, count]) => count > 1)
    console.log(`Found ${duplicates.length} duplicate recommendations (stock_id + game_date).`)
    if (duplicates.length > 0) {
      console.log('Sample duplicates:', duplicates.slice(0, 5))
    }
    return
  }

  console.log('Duplicate results from RPC:', data)
}

checkDuplicates()
