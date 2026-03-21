import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '로그인이 필요합니다.',
    })
  }

  const { data, error } = await (client as any)
    .from('wishlists')
    .select(`
      id,
      stock_id,
      created_at,
      stocks (
        id,
        code,
        name,
        sector,
        last_price,
        change_amount,
        change_rate
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return data
})
