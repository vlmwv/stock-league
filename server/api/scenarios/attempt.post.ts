import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '로그인이 필요합니다.'
    })
  }

  const client = await serverSupabaseClient(event)
  const body = await readBody(event)
  const { scenarioId, correctCount, totalDays: rawTotalDays } = body

  if (scenarioId === undefined || correctCount === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: '시나리오 ID(scenarioId)와 맞춘 일수(correctCount)가 필요합니다.'
    })
  }

  // 동적 최종 정답률 계산 (소수점 둘째 자리 반올림)
  // 예측은 7일차부터 시작하므로 실제 예측을 수행한 일수는 (totalDays - 7) 일입니다.
  const totalDays = Number(rawTotalDays || 30)
  const playDays = totalDays > 7 ? totalDays - 7 : totalDays
  const score = Math.round((correctCount / playDays) * 10000) / 100

  const { data, error } = await (client as any)
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
    // PostgreSQL Unique Constraint Violation
    if (error.code === '23505') {
      throw createError({
        statusCode: 403,
        statusMessage: '이미 도전이 완료된 시나리오입니다. 시나리오당 한 번만 도전하실 수 있습니다.'
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
