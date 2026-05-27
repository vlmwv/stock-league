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

async function testInsert() {
  console.log('Testing direct insert to scenario_attempts...')
  
  // 1. 테스트용 임의의 유저 ID (auth.users에서 한 명의 ID 가져오기)
  const { data: users, error: userError } = await supabase.auth.admin.listUsers({
    limit: 1
  })
  
  if (userError || !users || users.users.length === 0) {
    console.error('Error fetching users or no users found:', userError)
    return
  }
  
  const testUserId = users.users[0].id
  console.log('Using test user ID:', testUserId)
  
  // 2. Insert 시도
  const { data, error } = await supabase
    .from('scenario_attempts')
    .insert({
      user_id: testUserId,
      scenario_id: 1, // 2008 글로벌 금융위기
      correct_count: 50,
      score: 34.72,
      total_days: 144
    })
    .select()
    
  if (error) {
    console.error('Direct Insert ERROR:', error)
  } else {
    console.log('Direct Insert SUCCESS:', data)
    
    // 3. 테스트 데이터 삭제 (원상 복구)
    console.log('Cleaning up test data...')
    const { error: delError } = await supabase
      .from('scenario_attempts')
      .delete()
      .eq('user_id', testUserId)
      .eq('scenario_id', 1)
      
    if (delError) {
      console.error('Clean up error:', delError)
    } else {
      console.log('Clean up success!')
    }
  }
}

testInsert()
