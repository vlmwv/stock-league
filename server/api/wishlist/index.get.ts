import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
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
    console.error('[API Wishlist Get]', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: '관심 종목을 불러오지 못했습니다.',
    })
  }

  return data
})
