import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function updateSector() {
  console.log('Fetching stocks with sector "복합기업"...')
  const { data, error } = await supabase
    .from('stocks')
    .select('id, name, code, sector')
    .eq('sector', '복합기업')

  if (error) {
    console.error('Error fetching stocks:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('No stocks found with sector "복합기업".')
    return
  }

  console.log(`Found ${data.length} stocks. Updating their sector to "지주"...`)

  for (const stock of data) {
    const { error: updateError } = await supabase
      .from('stocks')
      .update({ sector: '지주', updated_at: new Date().toISOString() })
      .eq('id', stock.id)

    if (updateError) {
      console.error(`Failed to update ${stock.name} (${stock.code}):`, updateError)
    } else {
      console.log(`Successfully updated ${stock.name} (${stock.code}) sector to "지주"`)
    }
  }

  console.log('Update completed.')
}

updateSector().catch(console.error)
