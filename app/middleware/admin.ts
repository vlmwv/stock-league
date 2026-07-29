export default defineNuxtRouteMiddleware(async () => {
  const client = useSupabaseClient()

  // getUser()는 서버와 클라이언트 모두에서 가장 안전하게 사용자를 가져오는 방법입니다.
  const { data: { user }, error: userError } = await client.auth.getUser()

  if (userError || !user) {
    return navigateTo('/login')
  }

  // 역할 판정은 서버 미들웨어(server/middleware/auth.ts)와 동일하게 app_metadata.role 기준으로 통일한다.
  // (profiles.role과 이원화되면 UI는 admin이지만 API는 403이 되는 불일치가 생긴다.)
  const role = (user.app_metadata?.role as string) || 'user'
  if (role !== 'admin') {
    // 권한이 없으면 메인 페이지로 리다이렉트
    return navigateTo('/')
  }
})
