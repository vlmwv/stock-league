import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  
  // API 요청만 검사 대상으로 함
  if (!url.pathname.startsWith('/api/')) {
    return
  }

  // 인증이 필요 없는 공개 API 목록 (화이트리스트)
  const publicRoutes = [
    '/api/hall-of-fame',
    '/api/rankings',
    '/api/stocks'
  ]

  // 현재 경로가 화이트리스트에 포함되는지 확인 (접두사 매칭)
  const isPublic = publicRoutes.some(route => url.pathname.startsWith(route))

  if (isPublic) {
    return
  }

  // 인증이 필요한 요청에 대해 세션 검증
  try {
    const user = await serverSupabaseUser(event)
    
    if (!user || !user.id) {
      console.warn(`[AuthMiddleware] Unauthorized access attempt to ${url.pathname}`)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: 로그인이 필요한 서비스입니다.'
      })
    }

    // 검증된 사용자 정보를 context에 저장하여 이후 라우트에서 활용 가능하게 함
    event.context.user = user
    console.log(`[AuthMiddleware] Authenticated user: ${user.id} for ${url.pathname}`)
  } catch (error: any) {
    if (error.statusCode === 401) {
      throw error
    }
    
    console.error(`[AuthMiddleware] Auth error: ${error.message}`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: 유효하지 않은 토큰이거나 세션이 만료되었습니다.'
    })
  }
})
