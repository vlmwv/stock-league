import { describe, it, expect } from 'vitest'
import { resolveOhlc, resolveRecPrice, type RecPriceHistoryRow } from '../../app/utils/stockHistory'

describe('resolveOhlc', () => {
  it('OHLC가 모두 있으면 그대로 반환', () => {
    expect(resolveOhlc({ open_price: 10, high_price: 15, low_price: 8, close_price: 12 }))
      .toEqual({ open: 10, high: 15, low: 8, close: 12 })
  })

  it('open/high/low가 비어 있으면 종가로 폴백', () => {
    expect(resolveOhlc({ close_price: 12 }))
      .toEqual({ open: 12, high: 12, low: 12, close: 12 })
    expect(resolveOhlc({ open_price: null, high_price: null, low_price: null, close_price: 20 }))
      .toEqual({ open: 20, high: 20, low: 20, close: 20 })
  })
})

describe('resolveRecPrice', () => {
  // loadRecPriceHistory는 price_date 내림차순으로 정렬해 반환하므로 그 순서를 재현한다.
  const history: RecPriceHistoryRow[] = [
    { stock_id: 1, price_date: '2026-07-28', close_price: 1000 },
    { stock_id: 1, price_date: '2026-07-27', close_price: 950 },
    { stock_id: 2, price_date: '2026-07-29', close_price: 500 }
  ]

  it('game_date 이전 가장 최신 종가를 기준가로 사용', () => {
    // 정렬이 내림차순이므로 7-28이 먼저 매칭된다
    expect(resolveRecPrice(history, 1, '2026-07-29')).toBe(1000)
  })

  it('이전 종가가 없고 당일 종가만 있으면 당일 종가 사용(신규 상장 등)', () => {
    expect(resolveRecPrice(history, 2, '2026-07-29')).toBe(500)
  })

  it('어느 시세도 없으면 null', () => {
    expect(resolveRecPrice(history, 999, '2026-07-29')).toBeNull()
  })

  it('stock_id 문자열/숫자 혼용도 동일 종목으로 매칭', () => {
    expect(resolveRecPrice(history, '1', '2026-07-29')).toBe(1000)
  })
})
