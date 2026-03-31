import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const { type, period_key, sort_by } = query

  if (!type || !period_key) {
    throw createError({
      statusCode: 400,
      statusMessage: '랭킹 타입(type)과 기간 키(period_key)가 필요합니다.',
    })
  }

  let orderColumn = 'rank'
  let ascending = true

  if (sort_by === 'win_rate') {
    orderColumn = 'win_rate'
    ascending = false
  } else if (sort_by === 'prediction_count') {
    orderColumn = 'prediction_count'
    ascending = false
  } else if (sort_by === 'win_count') {
    orderColumn = 'win_count'
    ascending = false
  }

  const { data, error } = await (client as any)
    .from('rankings')
    .select(`
      id,
      user_id,
      ranking_type,
      period_key,
      win_rate,
      prediction_count,
      win_count,
      rank,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq('ranking_type', type)
    .eq('period_key', period_key)
    .order(orderColumn, { ascending })
    .order('rank', { ascending: true })
    .limit(100)

  if (error) {
    console.error(`[API Rankings] Database error for ${type}/${period_key}:`, error.message)
    // 500 에러를 던지는 대신 빈 결과를 반환하여 프론트엔드에서 처리하도록 함
    return []
  }

  return data || []
})
