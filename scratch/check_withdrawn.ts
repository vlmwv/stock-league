import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkWithdrawn() {
  const { data, count, error } = await supabase
    .from('daily_stocks')
    .select('id, status', { count: 'exact' })
    .eq('status', 'withdrawn')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Number of withdrawn recommendations: ${count}`)
  if (data && data.length > 0) {
    console.log('Sample withdrawn data:', data.slice(0, 5))
  }
}

checkWithdrawn()
