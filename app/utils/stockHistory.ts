// 추천 기준가(rec_price) 계산 공통 헬퍼.
// useStock.ts의 targetedStocks / fetchAiHistory / fetchAiHistoryMonthly에서
// 중복되던 시세 이력 조회 및 기준가 결정 로직을 추출한 것이다.

export interface RecPriceHistoryRow {
  stock_id: number | string
  price_date: string
  close_price: number
}

// 추천 항목들의 기준가(추천 전일 종가)를 찾기 위해 필요한 시세 이력을 한 번에 조회한다.
// 주말/공휴일을 고려해 가장 이른 game_date보다 10일 더 이전부터 조회한다.
export const loadRecPriceHistory = async (
  client: any,
  stockIds: (number | string)[],
  gameDates: string[]
): Promise<RecPriceHistoryRow[]> => {
  if (stockIds.length === 0 || gameDates.length === 0) return []

  const parseDateSafe = (dStr: string) => {
    const [y, m, d] = dStr.split('-')
    return (y && m && d)
      ? new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
      : new Date(dStr)
  }

  const minTime = Math.min(...gameDates.map(d => parseDateSafe(d).getTime()))
  const searchStartDate = new Date(minTime)
  searchStartDate.setDate(searchStartDate.getDate() - 10)
  const searchStartDateStr = searchStartDate.toISOString().split('T')[0]

  const { data } = await client
    .from('stock_price_history')
    .select('stock_id, price_date, close_price')
    .in('stock_id', stockIds)
    .gte('price_date', searchStartDateStr)
    .order('price_date', { ascending: false })

  return (data || []) as RecPriceHistoryRow[]
}

// 특정 종목/추천일의 기준가를 결정한다.
// game_date 이전 가장 최신 종가를 우선 사용하고, 없으면(신규 상장 등) 당일 종가를 사용한다.
// 어느 쪽 시세도 없으면 null을 반환하여 호출 측에서 추천 항목을 제외하도록 한다.
export const resolveRecPrice = (
  historyPrices: RecPriceHistoryRow[],
  stockId: number | string,
  gameDate: string
): number | null => {
  const recPriceRecord = historyPrices.find(hp =>
    Number(hp.stock_id) === Number(stockId) && hp.price_date < gameDate
  )
  const sameDayRecord = historyPrices.find(hp =>
    Number(hp.stock_id) === Number(stockId) && hp.price_date === gameDate
  )

  if (!recPriceRecord && !sameDayRecord) return null

  return recPriceRecord?.close_price || sameDayRecord?.close_price || 0
}
