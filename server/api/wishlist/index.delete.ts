import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }

  const body = await readBody(event)
  const { stock_id } = body

  if (!stock_id) {
    throw createError({
      statusCode: 400,
      statusMessage: '주식 ID(stock_id)가 필요합니다.',
    })
  }

  const { error } = await client
    .from('wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('stock_id', stock_id)

  if (error) {
    console.error('[API Wishlist Delete]', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: '관심 종목 삭제에 실패했습니다.',
    })
  }

  return {
    success: true,
    message: '찜 목록에서 제거되었습니다.'
  }
})
