import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

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
    '/api/scenarios/rankings',
    '/api/stocks',
    '/api/_nuxt_icon'
  ]

  // 현재 경로가 화이트리스트에 포함되는지 확인 (접두사 매칭)
  const isPublic = publicRoutes.some(route => url.pathname.startsWith(route))

  if (isPublic) {
    return
  }

  // 인증이 필요한 요청에 대해 세션 검증
  try {
    let user = null
    
    // 1. Authorization 헤더가 있는 경우 Bearer 토큰 직접 검증 수행
    const authHeader = getRequestHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const client = await serverSupabaseClient(event)
        const { data: { user: authUser }, error } = await client.auth.getUser(token)
        if (!error && authUser) {
          user = authUser
        }
      } catch (err) {
        console.error('[AuthMiddleware] Header token verification fail:', err)
      }
    }
    
    // 2. 헤더에 토큰이 없거나 검증에 실패한 경우 기존 쿠키 기반 세션 사용
    if (!user) {
      user = await serverSupabaseUser(event)
    }
    
    if (!user || !user.id) {
      console.warn(`[AuthMiddleware] Unauthorized access attempt to ${url.pathname}`)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: 로그인이 필요한 서비스입니다.'
      })
    }

    // RBAC: app_metadata에서 역할 정보를 가져옴
    const role = (user.app_metadata?.role as string) || 'user'
    
    // 관리자 전용 경로 체크 (/api/admin/**)
    if (url.pathname.startsWith('/api/admin/') && role !== 'admin') {
      console.warn(`[AuthMiddleware] Forbidden access attempt by ${user.id} to ${url.pathname}`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: 관리자 전용 기능입니다.'
      })
    }

    // 검증된 사용자 정보 및 역할을 context에 저장
    event.context.user = { ...user, role } as any
    
    console.log(`[AuthMiddleware] Authenticated user: ${user.id} (Role: ${role}) for ${url.pathname}`)
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw error
    }
    
    console.error(`[AuthMiddleware] Auth error: ${error.message}`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: 유효하지 않은 토큰이거나 세션이 만료되었습니다.'
    })
  }
})
