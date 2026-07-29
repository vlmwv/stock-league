// Supabase 클라이언트/유저/토스트 및 세션 하이브리드 검증(resolveUserId)을 묶어 제공한다.
// useStock 및 향후 분리될 도메인 컴포저블들이 공통으로 사용한다.
// useSupabaseUser()의 Nuxt 리액티브 캐싱 타이밍 버그를 피하기 위해
// 캐시된 user가 없으면 auth.getSession()으로 직접 세션을 확인한다.
export const useStockClient = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  // 클라이언트 측 인증 판정의 단일 진입점 — 페이지/컴포저블에서 동일 블록을 복제하지 말 것.
  // useSupabaseUser()가 id 없는 부분 객체로 채워지는 경우가 있어(헤더는 로그인으로 보이지만 id가 없음
  // → resolveUserId가 null이 되어 "로그인 필요"로 오판), 유효한 id가 없으면 auth.getUser()로
  // 서버 검증해 정식 user(id 포함)를 확보한다. getSession()은 같은 부분 세션을 반환할 수 있어 쓰지 않는다.
  const resolveUser = async () => {
    if (user.value?.id) return user.value
    try {
      const { data, error } = await client.auth.getUser()
      if (error) {
        console.warn('[useStockClient] Failed to resolve user:', error.message)
        return null
      }
      return data.user ?? null
    } catch (e) {
      console.error('[useStockClient] resolveUser exception:', e)
      return null
    }
  }

  const resolveUserId = async () => (await resolveUser())?.id ?? null

  // "로그인 필요" 확인 후 로그인 페이지로 이동. 여러 컴포저블에 복제돼 있던 confirm 블록의 단일 출처.
  const confirmLoginRedirect = () => {
    if (import.meta.client && confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
      navigateTo('/login')
    }
  }

  return { client, user, toast, resolveUser, resolveUserId, confirmLoginRedirect }
}
