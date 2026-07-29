export default defineNuxtRouteMiddleware(async () => {
  const client = useSupabaseClient()

  // getUser()는 서버와 클라이언트 모두에서 가장 안전하게 사용자를 가져오는 방법입니다.
  // useSupabaseUser()는 로그인 직후/네비게이션 타이밍에 null이거나 id 없는 부분 객체가 되어
  // 로그인 상태인데도 /login으로 튕기는 리액티브 캐싱 버그가 있어 사용하지 않습니다(admin.ts와 동일 패턴).
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    return navigateTo('/login')
  }
})
