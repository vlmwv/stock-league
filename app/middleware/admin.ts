export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  if (!user.value) {
    return navigateTo('/login')
  }

  // 사용자의 role을 확인하기 위해 profiles 테이블 조회
  const { data: profile, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .single()

  if (error || !profile || (profile as any).role !== 'admin') {
    // 권한이 없으면 메인 페이지로 리다이렉트 (에러 메시지 등을 쿼리로 전달 가능)
    return navigateTo('/')
  }
})
