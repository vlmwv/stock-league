export default defineNuxtRouteMiddleware(async (to, from) => {
  const client = useSupabaseClient()

  // getUser()는 서버와 클라이언트 모두에서 가장 안전하게 사용자를 가져오는 방법입니다.
  const { data: { user }, error: userError } = await client.auth.getUser()

  if (userError || !user) {
    return navigateTo('/login')
  }

  // 사용자의 role을 확인하기 위해 profiles 테이블 조회
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || (profile as any).role !== 'admin') {
    // 권한이 없으면 메인 페이지로 리다이렉트
    return navigateTo('/')
  }
})
