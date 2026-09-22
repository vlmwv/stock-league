import { createClient } from '@supabase/supabase-js'
import { getActiveLeagueDate, isPredictionWindowOpen } from '~/utils/kst'

// 예측 저장의 단일 진입점.
// predictions 테이블은 클라이언트 쓰기 권한이 없으므로(20260921000000_lock_predictions_write.sql)
// 이 API가 service_role로 삽입한다. 클라이언트가 보낸 날짜·결과는 신뢰하지 않고
// 접수 시간대·리그 종목 여부를 서버에서 재검증한 뒤 game_date를 직접 계산해 저장한다.
export default defineEventHandler(async (event) => {
  // 인증: 서버 미들웨어(server/middleware/auth.ts)가 쿠키/Bearer로 검증해 context.user에 주입한다.
  const user = event.context.user
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }

  const body = await readBody(event)
  const { stock_id, prediction_type } = body

  if (prediction_type !== 'up' && prediction_type !== 'down') {
    throw createError({
      statusCode: 400,
      statusMessage: "예측 값은 'up' 또는 'down'만 허용됩니다."
    })
  }

  const stockId = Number(stock_id)
  if (!Number.isInteger(stockId) || stockId <= 0) {
    throw createError({ statusCode: 400, statusMessage: '유효한 종목 ID(stock_id)가 필요합니다.' })
  }

  // 접수 시간대 검증 — 클라이언트 UI 가드(usePredictions.predict)와 동일 기준을 서버에서 재확인한다.
  const now = new Date()
  if (!isPredictionWindowOpen(now)) {
    throw createError({
      statusCode: 403,
      statusMessage: '예측 접수 시간이 아닙니다. (21:20 ~ 익일 08:00)'
    })
  }

  // 대상 리그 날짜는 클라이언트 입력이 아니라 서버 시각으로 결정한다(과거 날짜 주입 차단).
  const gameDate = getActiveLeagueDate(now)

  // 서비스 롤 클라이언트 (RLS 우회 — predictions insert/update는 서버만 가능)
  const config = useRuntimeConfig()
  const adminClient = createClient(config.public.supabase.url, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 해당 날짜의 리그 종목인지 검증 (리그 외 종목 예측으로 승률을 부풀리지 못하도록 제한)
  const { data: leagueStock, error: leagueError } = await adminClient
    .from('daily_stocks')
    .select('id')
    .eq('game_date', gameDate)
    .eq('stock_id', stockId)
    .maybeSingle()

  if (leagueError) {
    console.error('[API Predict] 리그 종목 조회 실패:', leagueError.message)
    throw createError({ statusCode: 500, statusMessage: '예측 저장 중 오류가 발생했습니다.' })
  }
  if (!leagueStock) {
    throw createError({ statusCode: 400, statusMessage: '오늘의 리그 종목이 아닙니다.' })
  }

  // 이미 채점된 예측은 변경할 수 없다(결과 확정 후 정답으로 덮어쓰기 차단).
  const { data: existing } = await adminClient
    .from('predictions')
    .select('id, result')
    .eq('user_id', user.id)
    .eq('stock_id', stockId)
    .eq('game_date', gameDate)
    .maybeSingle()

  if (existing && existing.result !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: '이미 채점이 완료된 예측입니다.' })
  }

  // 마감 전 예측 변경은 허용하므로 upsert. result/points_awarded는 서버가 고정값으로 강제한다.
  const { data, error } = await adminClient
    .from('predictions')
    .upsert({
      user_id: user.id,
      stock_id: stockId,
      game_date: gameDate,
      prediction_type,
      result: 'pending',
      points_awarded: 0
    }, { onConflict: 'user_id,stock_id,game_date' })
    .select('stock_id, game_date, prediction_type, result')
    .single()

  if (error) {
    console.error('[API Predict] DB Upsert Error:', error.message)
    throw createError({ statusCode: 500, statusMessage: '예측 저장에 실패했습니다.' })
  }

  return data
})
