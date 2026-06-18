// 시나리오 데이터 시드 스크립트 (#4 DB 이관).
// scripts/scenario-seed-data.ts의 절차적 생성기로 만든 캔들/이벤트를 public.scenarios에 upsert한다.
//   사전: 20260617000000_create_scenarios.sql 마이그레이션이 라이브 DB에 적용돼 있어야 함.
//   실행: npx tsx scripts/seed_scenarios.ts
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { SCENARIO_SEED } from './scenario-seed-data'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars: NUXT_PUBLIC_SUPABASE_URL / NUXT_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const rows = SCENARIO_SEED.map((s, i) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    difficulty: s.difficulty,
    type: s.type,
    index_name: s.indexName,
    etf_name: s.etfName,
    start_date: s.startDate,
    end_date: s.endDate,
    description: s.description,
    candles: s.candles,
    events: s.events,
    sort_order: i,
    updated_at: new Date().toISOString()
  }))

  const totalCandles = rows.reduce((acc, r) => acc + r.candles.length, 0)
  console.log(`[seed_scenarios] ${supabaseUrl}`)
  console.log(`[seed_scenarios] 시나리오 ${rows.length}개 / 캔들 ${totalCandles}개 upsert 시작...`)

  const { error } = await supabase.from('scenarios').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('[seed_scenarios] upsert 실패:', error.message)
    process.exit(1)
  }

  // 검증: 행 수 재조회
  const { count, error: countErr } = await supabase
    .from('scenarios')
    .select('*', { count: 'exact', head: true })
  if (countErr) {
    console.warn('[seed_scenarios] 검증 조회 실패(시드는 성공):', countErr.message)
  }

  console.log(`✅ 시드 완료 — scenarios 테이블 ${count ?? rows.length}행`)
  process.exit(0)
}

main().catch((e) => {
  console.error('[seed_scenarios] 실행 실패:', e)
  process.exit(1)
})
