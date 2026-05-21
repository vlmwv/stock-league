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

  const { data, error } = await (client as any)
    .from('scenario_attempts')
    .select(`
      score,
      correct_count,
      completed_at,
      profiles (
        username,
        full_name,
        display_name_type,
        avatar_url,
        gender
      )
    `)
    .eq('scenario_id', Number(scenarioId))
    .order('score', { ascending: false })         // 정답률이 높은 순
    .order('completed_at', { ascending: true })   // 동점 시 더 일찍 완주한 사람 우대 (선착순)
    .limit(100)

  if (error) {
    console.error(`[API Scenarios Rankings] DB Query Error for scenario ${scenarioId}:`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data || []
})
