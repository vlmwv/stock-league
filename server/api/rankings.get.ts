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

  const selectQuery = `
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
      full_name,
      display_name_type,
      avatar_url,
      gender
    )
  `

  const { data, error } = await (client as any)
    .from('rankings')
    .select(selectQuery)
    .eq('ranking_type', type)
    .eq('period_key', period_key)
    .order(orderColumn, { ascending })
    .order('rank', { ascending: true })
    .limit(100)

  if (error) {
    console.error(`[API Rankings] Database error for ${type}/${period_key}:`, error.message)
    return []
  }

  return data || []
})
