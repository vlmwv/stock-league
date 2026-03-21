import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const { type, period_key } = query

  if (!type || !period_key) {
    throw createError({
      statusCode: 400,
      statusMessage: '랭킹 타입(type)과 기간 키(period_key)가 필요합니다.',
    })
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
      rank,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq('ranking_type', type)
    .eq('period_key', period_key)
    .order('rank', { ascending: true })
    .limit(50)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return data
})
