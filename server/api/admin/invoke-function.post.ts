// 관리자의 Edge Function 수동 실행 경유지.
// Edge Function은 service_role 키로만 호출할 수 있게 잠겼으므로(supabase/functions/_shared/auth.ts),
// 브라우저에서 직접 functions.invoke를 호출할 수 없다.
// 이 라우트는 /api/admin/** 가드(server/middleware/auth.ts, app_metadata.role === 'admin')를 통과한
// 요청만 받아 서버가 보관한 service_role 키로 함수를 대신 호출한다.
const ALLOWED_FUNCTIONS = [
  'calculate-rankings',
  'fetch-market-news-periodically',
  'process-daily-results',
  'select-daily-stocks',
  'update-krx-stocks',
  'update-krx-top-100',
  're-evaluate-recommendation'
] as const

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const serviceRoleKey = (config.supabaseServiceRoleKey || '').trim()
  const supabaseUrl = config.public.supabase?.url

  if (!serviceRoleKey || !supabaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase 서버 설정이 누락되었습니다.' })
  }

  const { name, body: functionBody } = await readBody(event)

  // 임의 함수 호출을 막기 위해 화이트리스트로 제한한다.
  if (!ALLOWED_FUNCTIONS.includes(name)) {
    throw createError({ statusCode: 400, statusMessage: '허용되지 않은 함수입니다.' })
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(functionBody ?? {})
  })

  const text = await response.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    console.error(`[API Admin Invoke] ${name} 실패 (${response.status}):`, text)
    throw createError({
      statusCode: 502,
      statusMessage: `함수 실행에 실패했습니다. (${name}: ${response.status})`
    })
  }

  return { success: true, data }
})
