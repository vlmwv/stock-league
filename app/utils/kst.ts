// KST(Asia/Seoul) 시각 계산 순수 함수 모음.
// 리그 타이밍 경계 상수를 단일 관리하고, 현재 시각(Date)을 인자로 받아 테스트 가능하게 한다.
// useKstTime 컴포저블이 new Date()를 주입해 이 함수들을 호출한다.

// 리그 타이밍 경계(KST, HHMM 정수) — 여러 파일에 흩어져 있던 매직넘버의 단일 출처.
export const LEAGUE_SELECT_TIME = 2120 // 21:20 — 다음 영업일 종목 선정, 이후 '내일 리그'로 전환
export const PREDICT_CLOSE_TIME = 800 // 08:00 — 예측 접수 마감
export const RESULT_PUBLISH_TIME = 2030 // 20:30 — 결과 발표

// 시스템 TZ와 무관하게 항상 KST 기준 날짜(YYYY-MM-DD)를 반환한다.
export const getKstDateString = (now: Date): string => {
  const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
  return new Intl.DateTimeFormat('sv-SE', options).format(now)
}

// KST 기준 시/분과 HHMM 정수(timeVal)를 반환한다.
export const getKstHourMinute = (now: Date): { hour: number, minute: number, timeVal: number } => {
  const options = { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false } as const
  const parts = new Intl.DateTimeFormat('en-GB', options).format(now).split(':')
  // 일부 런타임이 자정을 '24'로 포맷하는 경우를 방어(자정을 timeVal 2400으로 오판하지 않도록).
  const hour = parseInt(parts[0] || '0') % 24
  const minute = parseInt(parts[1] || '0')
  return { hour, minute, timeVal: hour * 100 + minute }
}

// 현재 활성 리그 날짜. 21:20 KST 이후에는 다음날 리그가 활성 대상이다.
export const getActiveLeagueDate = (now: Date): string => {
  const today = getKstDateString(now)
  const { timeVal } = getKstHourMinute(now)
  if (timeVal >= LEAGUE_SELECT_TIME) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return getKstDateString(tomorrow)
  }
  return today
}

// 예측 접수 가능 시간대(21:20 종목 선정 ~ 익일 08:00 마감) 여부.
// 서버 검증(/api/predictions/submit)과 UI(useDailyStocks.isLeagueOpen)가 동일한 기준을 쓰도록 단일화한다.
export const isPredictionWindowOpen = (now: Date): boolean => {
  const { timeVal } = getKstHourMinute(now)
  return timeVal >= LEAGUE_SELECT_TIME || timeVal < PREDICT_CLOSE_TIME
}
