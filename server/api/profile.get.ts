import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    return null
  }

  const { data, error } = await (client as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  // 프로필이 없는 경우 기본값 생성 또는 에러 처리
  if (!data) {
    return {
      id: user.id,
      username: user.email?.split('@')[0] || '익명',
      points: 0,
      avatar_url: null
    }
  }

  return data
})
