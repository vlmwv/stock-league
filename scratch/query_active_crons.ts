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

async function run() {
  console.log('Querying active pg_cron jobs from database...')
  
  // cron 테이블은 cron 스키마에 있어서 일반적인 select로는 조회가 안 될 수 있습니다.
  // SQL을 직접 실행해주는 RPC가 없으면 raw query를 실행하기 힘드므로, 
  // 대신에 supabase.rpc 또는 postgres 직접 접속이 불가능할 때는 
  // schema migration 히스토리를 대략 파악하거나, 
  // batch_execution_logs 에서 어떤 함수들이 돌고 있는지 보는 것이 대안입니다.
  
  // 혹시 sql을 실행할 수 있는 RPC가 정의되어 있는지 확인해보겠습니다.
  const { data: functions, error } = await supabase
    .rpc('get_active_cron_jobs') // 혹시 있을까 해서 테스트
    
  if (error) {
    console.log('RPC get_active_cron_jobs not found, trying query on pg_catalog or cron schema via dynamic SQL if possible...')
    
    // 일반적인 rpc가 없을 경우를 대비해 batch_execution_logs 에서 과거 50개 로그를 뒤져서 
    // 오늘 또는 최근 며칠간 어떤 종류의 batch function들이 돌았는지 확인하겠습니다.
    const { data: logs } = await supabase
      .from('batch_execution_logs')
      .select('function_name')
      
    const uniqueFuncs = Array.from(new Set(logs?.map(l => l.function_name)))
    console.log('Unique batch functions historically executed in logs:', uniqueFuncs)
  } else {
    console.log('Active cron jobs:', functions)
  }
}

run()
