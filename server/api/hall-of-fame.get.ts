import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  
  const { data, error } = await (client as any)
    .from('hall_of_fame')
    .select(`
      id,
      user_id,
      period_type,
      period_key,
      rank,
      win_rate,
      prediction_count,
      points,
      profiles (
        username,
        avatar_url
      )
    `)
    .order('recorded_at', { ascending: false })
    .order('rank', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return data
})
