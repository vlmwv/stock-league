// Supabase 클라이언트/유저/토스트 및 세션 하이브리드 검증(resolveUserId)을 묶어 제공한다.
// useStock 및 향후 분리될 도메인 컴포저블들이 공통으로 사용한다.
// useSupabaseUser()의 Nuxt 리액티브 캐싱 타이밍 버그를 피하기 위해
// 캐시된 user가 없으면 auth.getSession()으로 직접 세션을 확인한다.
export const useStockClient = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  // 캐시된 user가 없으면 getSession()으로 세션의 유저 객체를 직접 조회한다.
  // 클라이언트 측 인증 판정의 단일 진입점 — 페이지/컴포저블에서 동일 블록을 복제하지 말 것.
  const resolveUser = async () => {
    if (user.value) return user.value
    try {
      const { data, error } = await client.auth.getSession()
      if (error) {
        console.warn('[useStockClient] Failed to resolve auth session:', error.message)
        return null
      }
      return data.session?.user ?? null
    } catch (e) {
      console.error('[useStockClient] resolveUser exception:', e)
      return null
    }
  }

  const resolveUserId = async () => (await resolveUser())?.id ?? null

  return { client, user, toast, resolveUser, resolveUserId }
}
