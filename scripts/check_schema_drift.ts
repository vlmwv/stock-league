// 42703 폴백 제거(#1) 사전 점검용 스크립트.
// 앱 코드가 42703 폴백으로 방어 중인 컬럼들이 라이브 DB에 실제 존재하는지 확인한다.
// 각 컬럼을 직접 SELECT 해보고 PostgREST 에러 코드 42703(undefined column) 여부로 판정한다.
//   실행: npx tsx scripts/check_schema_drift.ts
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars: NUXT_PUBLIC_SUPABASE_URL / NUXT_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 앱 폴백(42703)이 방어 중인 (테이블, 컬럼) 목록과 해당 폴백 위치
const TARGETS: { table: string; column: string; usedBy: string }[] = [
  { table: 'profiles', column: 'gender', usedBy: 'useRankings:27 / useUserProfile:23 / server/api/rankings.get.ts:57' },
  { table: 'profiles', column: 'role', usedBy: 'useUserProfile:23' },
  { table: 'daily_stocks', column: 'ai_result', usedBy: 'useDailyStocks:96,168' },
  { table: 'daily_stocks', column: 'status', usedBy: 'useDailyStocks:96,168' },
]

async function checkColumn(table: string, column: string): Promise<'exists' | 'missing' | 'error'> {
  const { error } = await supabase.from(table).select(column).limit(1)
  if (!error) return 'exists'
  if (error.code === '42703') return 'missing'
  console.error(`  ↳ 예상치 못한 에러 (${table}.${column}):`, error.code, error.message)
  return 'error'
}

async function main() {
  console.log(`\n[check_schema_drift] 대상: ${supabaseUrl}\n`)
  const results: { target: string; status: string; usedBy: string }[] = []
  let allExist = true

  for (const t of TARGETS) {
    const status = await checkColumn(t.table, t.column)
    if (status !== 'exists') allExist = false
    const mark = status === 'exists' ? '✅ 존재' : status === 'missing' ? '❌ 없음(42703)' : '⚠️ 에러'
    console.log(`${mark}  ${t.table}.${t.column}`)
    results.push({ target: `${t.table}.${t.column}`, status, usedBy: t.usedBy })
  }

  console.log('\n─────────────────────────────────────────────')
  if (allExist) {
    console.log('✅ 4개 컬럼 모두 라이브 DB에 존재 → 42703 폴백 6곳을 안전하게 제거할 수 있습니다.')
    console.log('   (제거 위치: useDailyStocks:96,168 / useRankings:27 / useUserProfile:23 / server/api/rankings.get.ts:57)')
  } else {
    console.log('❌ 일부 컬럼이 라이브 DB에 없습니다 → 폴백을 유지해야 합니다.')
    console.log('   누락 컬럼의 마이그레이션을 먼저 라이브에 적용한 뒤 재확인하세요.')
    for (const r of results.filter(r => r.status !== 'exists')) {
      console.log(`   - ${r.target} (${r.status})  ← 폴백 사용처: ${r.usedBy}`)
    }
  }
  console.log('')
  process.exit(allExist ? 0 : 1)
}

main().catch((e) => {
  console.error('[check_schema_drift] 실행 실패:', e)
  process.exit(1)
})
