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

  const body = await readBody(event)
  const { stock_id } = body

  if (!stock_id) {
    throw createError({
      statusCode: 400,
      statusMessage: '주식 ID(stock_id)가 필요합니다.',
    })
  }

  // 중복 확인
  const { data: existing } = await client
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('stock_id', stock_id)
    .maybeSingle()

  if (existing) {
    return {
      success: true,
      message: '이미 찜 목록에 존재합니다.',
      data: existing
    }
  }

  const { data, error } = await (client as any)
    .from('wishlists')
    .insert({
      user_id: user.id,
      stock_id
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return {
    success: true,
    data
  }
})
