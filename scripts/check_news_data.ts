
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkNews() {
  const { data, error } = await supabase
    .from('news')
    .select('title, url, type, source, stocks(code)')
    .order('published_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log(JSON.stringify(data, null, 2))
}

checkNews()
