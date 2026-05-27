import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scenarioId = query.scenarioId

  if (!scenarioId) {
    throw createError({
      statusCode: 400,
      statusMessage: '시나리오 ID(scenarioId)가 누락되었습니다.'
    })
  }

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 1단계: attempts 조회
  const { data: attempts, error: attemptError } = await adminClient
    .from('scenario_attempts')
    .select('user_id, score, correct_count, total_days, completed_at')
    .eq('scenario_id', Number(scenarioId))
    .order('score', { ascending: false })
    .order('completed_at', { ascending: true })
    .limit(100)

  if (attemptError) {
    console.error(`[API Scenarios Rankings] attempts error:`, attemptError.message)
    throw createError({ statusCode: 500, statusMessage: attemptError.message })
  }

  if (!attempts || attempts.length === 0) {
    return []
  }

  // 2단계: 프로필 일괄 조회
  const userIds = [...new Set(attempts.map((a: any) => a.user_id))]
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, username, avatar_url, gender')
    .in('id', userIds)

  // 3단계: 병합
  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
  return attempts.map((attempt: any) => ({
    score: attempt.score,
    correct_count: attempt.correct_count,
    total_days: attempt.total_days,
    completed_at: attempt.completed_at,
    profiles: profileMap.get(attempt.user_id) || null
  }))
})
