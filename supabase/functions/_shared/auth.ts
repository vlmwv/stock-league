// Edge Function 호출 인가 공용 가드.
// config.toml의 verify_jwt=true는 "유효한 JWT면 통과"라서 프론트에 노출된 anon 키로도 호출된다.
// 즉 외부에서 process-daily-results를 장중에 호출해 채점을 확정시키거나,
// select-daily-stocks를 반복 호출해 종목을 재추첨(+LLM 비용)시킬 수 있었다.
// cron(pg_cron → pg_net)은 Vault의 service_role_key를 Bearer로 보내므로(fix_all_cron_jobs.sql),
// 그 키와 정확히 일치하는 요청만 통과시킨다.
// (Nuxt의 server/routes/api/stocks/prepare-daily.ts와 동일한 인가 방식)
// 관리자의 수동 실행은 브라우저가 아니라 서버 API(/api/admin/invoke-function)를 경유한다.

// 프로젝트마다 시크릿 이름이 SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY로 갈려 있어 둘 다 허용한다.
const serviceRoleKeys = (): string[] =>
  [Deno.env.get('SERVICE_ROLE_KEY'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')]
    .map(v => (v || '').trim())
    .filter(v => v.length > 0)

// 토큰 비교는 조기 종료 없이 수행한다.
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export const isAuthorizedBatchCall = (req: Request): boolean => {
  const keys = serviceRoleKeys()
  if (keys.length === 0) return false

  const header = req.headers.get('Authorization') || ''
  if (!header.startsWith('Bearer ')) return false

  const token = header.slice(7).trim()
  return keys.some(key => safeEqual(token, key))
}

export const unauthorizedResponse = (): Response =>
  new Response(
    JSON.stringify({ error: 'Unauthorized: 이 함수는 service_role 키로만 호출할 수 있습니다.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
