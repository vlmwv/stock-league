import { createClient } from '@supabase/supabase-js'

// 예측 시작 일차 — 클라이언트(useScenarioGame)는 초기 7일치 캔들을 보여준 뒤 8번째 캔들부터 예측을 받는다.
// 즉 예측 대상 캔들은 candles[START_DAY] ~ candles[length-1] 이며, 예측 개수는 length - START_DAY 이다.
const START_DAY = 7

type Candle = { open: number, close: number }

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { scenarioId, predictions } = body

  // 인증: 서버 미들웨어(server/middleware/auth.ts)가 쿠키/Bearer로 검증해 context.user에 주입한다.
  const user = event.context.user
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }

  // 입력 검증: 점수는 클라이언트 값을 신뢰하지 않고 예측 배열만 받아 서버에서 재계산한다.
  if (scenarioId === undefined || !Array.isArray(predictions)) {
    throw createError({
      statusCode: 400,
      statusMessage: '시나리오 ID(scenarioId)와 예측 배열(predictions)이 필요합니다.'
    })
  }
  if (!predictions.every(p => p === 'up' || p === 'down')) {
    throw createError({
      statusCode: 400,
      statusMessage: "예측 값은 'up' 또는 'down'만 허용됩니다."
    })
  }

  // 서비스 롤 클라이언트 (RLS 우회 — scenario_attempts insert는 서버만 가능)
  const config = useRuntimeConfig()
  const adminClient = createClient(config.public.supabase.url, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 시나리오 캔들 로드 (정답 판정의 신뢰 소스)
  const { data: scenario, error: scenarioError } = await adminClient
    .from('scenarios')
    .select('candles')
    .eq('id', Number(scenarioId))
    .maybeSingle()

  if (scenarioError) {
    console.error('[API Scenarios Attempt] 시나리오 조회 실패:', scenarioError.message)
    throw createError({ statusCode: 500, statusMessage: '시나리오 조회 중 오류가 발생했습니다.' })
  }
  const candles = (scenario?.candles ?? []) as Candle[]
  if (candles.length <= START_DAY) {
    throw createError({ statusCode: 404, statusMessage: '유효하지 않은 시나리오입니다.' })
  }

  // 예측 개수는 실제 예측 대상 일수와 정확히 일치해야 한다(부분 제출·조작 방지).
  const playDays = candles.length - START_DAY
  if (predictions.length !== playDays) {
    throw createError({
      statusCode: 400,
      statusMessage: `예측 개수가 올바르지 않습니다. (기대: ${playDays}, 실제: ${predictions.length})`
    })
  }

  // 서버 재계산: 각 예측 대상 캔들의 시가 대비 종가로 실제 등락을 판정한다(클라이언트 판정과 동일).
  let correctCount = 0
  for (let i = 0; i < playDays; i++) {
    const candle = candles[START_DAY + i]
    if (!candle) continue
    const actual = candle.close >= candle.open ? 'up' : 'down'
    if (predictions[i] === actual) correctCount++
  }
  const score = Math.round((correctCount / playDays) * 10000) / 100

  // 중복 도전 검사 (시나리오당 1회)
  const { data: existing } = await adminClient
    .from('scenario_attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('scenario_id', Number(scenarioId))
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 403,
      statusMessage: '이미 도전이 완료된 시나리오입니다. 시나리오당 한 번만 도전하실 수 있습니다.'
    })
  }

  // 기록 삽입
  const { data, error } = await adminClient
    .from('scenario_attempts')
    .insert({
      user_id: user.id,
      scenario_id: Number(scenarioId),
      correct_count: correctCount,
      score: score,
      total_days: candles.length
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 403, statusMessage: '이미 도전이 완료된 시나리오입니다.' })
    }
    console.error('[API Scenarios Attempt] DB Insert Error:', error.message)
    throw createError({ statusCode: 500, statusMessage: '기록 저장 중 오류가 발생했습니다.' })
  }

  return data
})
