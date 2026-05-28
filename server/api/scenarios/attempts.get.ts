import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // Bearer 토큰 추출
  const authHeader = getRequestHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: '로그인이 필요합니다.'
    })
  }
  const token = authHeader.substring(7)

  // Supabase Admin 클라이언트로 유저 검증
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || ''
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: '유효하지 않은 토큰입니다.'
    })
  }

  // 해당 유저의 도전 이력 조회
  const { data, error } = await adminClient
    .from('scenario_attempts')
    .select('scenario_id, score, correct_count, total_days, completed_at')
    .eq('user_id', user.id)

  if (error) {
    console.error('[API Scenarios Attempts] Query Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data || []
})
