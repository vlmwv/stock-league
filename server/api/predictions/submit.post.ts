import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = event.context.user

  const body = await readBody(event)
  const { stock_id, prediction_type } = body

  if (!stock_id || !prediction_type) {
    throw createError({
      statusCode: 400,
      statusMessage: '필수 항목이 누락되었습니다 (stock_id, prediction_type).',
    })
  }

  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()) as string

  // 해당 날짜에 동일 종목에 대한 예측이 이미 존재하는지 확인
  const { data: existing } = await (client as any)
    .from('predictions')
    .select('id')
    .eq('user_id', user.id)
    .eq('stock_id', stock_id)
    .eq('game_date', today)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: '이미 이 종목에 대해 오늘의 예측을 제출하셨습니다.',
    })
  }

  // 예측 데이터 삽입
  const { data, error } = await (client as any)
    .from('predictions')
    .insert({
      user_id: user.id,
      stock_id,
      game_date: today,
      prediction_type,
      result: 'pending'
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
