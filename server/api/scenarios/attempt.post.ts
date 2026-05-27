import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { scenarioId, correctCount, totalDays: rawTotalDays } = body

  if (scenarioId === undefined || correctCount === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: '시나리오 ID(scenarioId)와 맞춘 일수(correctCount)가 필요합니다.'
    })
  }

  // Bearer 토큰 추출
  const authHeader = getRequestHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: '로그인이 필요합니다.'
    })
  }
  const token = authHeader.substring(7)

  // Supabase 서비스 롤 클라이언트 생성 (RLS 우회, 관리용)
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 유저 토큰으로 사용자 확인
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: '유효하지 않은 토큰입니다. 다시 로그인해 주세요.'
    })
  }

  // 정답률 계산 (예측은 7일차부터 시작하므로 실제 예측 일수는 totalDays - 7)
  const totalDays = Number(rawTotalDays || 30)
  const playDays = totalDays > 7 ? totalDays - 7 : totalDays
  const score = Math.round((correctCount / playDays) * 10000) / 100

  // 기존 기록 여부 먼저 확인 (Upsert 대신 명시적 확인)
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
      correct_count: Number(correctCount),
      score: score,
      total_days: totalDays
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({
        statusCode: 403,
        statusMessage: '이미 도전이 완료된 시나리오입니다.'
      })
    }
    console.error('[API Scenarios Attempt] DB Insert Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
