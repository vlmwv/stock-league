import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scenarioId = query.scenarioId

  if (!scenarioId) {
    throw createError({
      statusCode: 400,
      statusMessage: '시나리오 ID(scenarioId)가 누락되었습니다.'
    })
  }

  const client = await serverSupabaseClient(event)

  // 1단계: attempts 테이블에서 해당 시나리오 랭킹 목록 조회
  const { data: attempts, error: attemptError } = await (client as any)
    .from('scenario_attempts')
    .select('user_id, score, correct_count, total_days, completed_at')
    .eq('scenario_id', Number(scenarioId))
    .order('score', { ascending: false })         // 정답률이 높은 순
    .order('completed_at', { ascending: true })   // 동점 시 더 일찍 완주한 사람 우대 (선착순)
    .limit(100)

  if (attemptError) {
    console.error(`[API Scenarios Rankings] attempts Query Error for scenario ${scenarioId}:`, attemptError.message)
    throw createError({
      statusCode: 500,
      statusMessage: attemptError.message
    })
  }

  if (!attempts || attempts.length === 0) {
    return []
  }

  // 2단계: 수집된 모든 user_id 일괄 추출
  const userIds = [...new Set(attempts.map((a: any) => a.user_id))]

  // 3단계: profiles 테이블에서 해당하는 사용자 프로필 일괄 조회
  const { data: profiles, error: profileError } = await (client as any)
    .from('profiles')
    .select('id, username, avatar_url, gender')
    .in('id', userIds)

  if (profileError) {
    console.error('[API Scenarios Rankings] profiles Join Query Error:', profileError.message)
    // 프로필 조회 실패 시 에러를 던지기보단 프로필 없는 상태로 랭킹이라도 보여주기 위해 에러 로깅만 수행
  }

  // 4단계: user_id 맵핑을 통해 랭킹 리스트 병합(Merge)
  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
  const mergedRankings = attempts.map((attempt: any) => {
    return {
      score: attempt.score,
      correct_count: attempt.correct_count,
      total_days: attempt.total_days,
      completed_at: attempt.completed_at,
      profiles: profileMap.get(attempt.user_id) || null
    }
  })

  return mergedRankings
})
