import { describe, it, expect } from 'vitest'
import {
  getKstDateString,
  getKstHourMinute,
  getActiveLeagueDate,
  isPredictionWindowOpen,
  LEAGUE_SELECT_TIME
} from '../../app/utils/kst'

describe('getKstDateString', () => {
  it('UTC 15:00은 다음날 00:00 KST이므로 날짜가 하루 넘어간다', () => {
    expect(getKstDateString(new Date('2026-07-29T15:00:00Z'))).toBe('2026-07-30')
  })

  it('UTC 14:59는 아직 23:59 KST라 같은 날짜', () => {
    expect(getKstDateString(new Date('2026-07-29T14:59:00Z'))).toBe('2026-07-29')
  })
})

describe('getKstHourMinute', () => {
  it('21:20 KST(=12:20 UTC)를 정확히 파싱', () => {
    expect(getKstHourMinute(new Date('2026-07-29T12:20:00Z'))).toEqual({ hour: 21, minute: 20, timeVal: 2120 })
  })

  it('자정 KST는 timeVal 0 (24로 오판하지 않음)', () => {
    expect(getKstHourMinute(new Date('2026-07-29T15:00:00Z'))).toEqual({ hour: 0, minute: 0, timeVal: 0 })
  })
})

describe('getActiveLeagueDate', () => {
  it('21:20 이전이면 오늘 KST 날짜', () => {
    // 12:00 KST (29일)
    expect(getActiveLeagueDate(new Date('2026-07-29T03:00:00Z'))).toBe('2026-07-29')
  })

  it('경계값 21:19는 아직 오늘', () => {
    expect(getActiveLeagueDate(new Date('2026-07-29T12:19:00Z'))).toBe('2026-07-29')
  })

  it('경계값 21:20(LEAGUE_SELECT_TIME) 정각부터 다음날 리그', () => {
    expect(LEAGUE_SELECT_TIME).toBe(2120)
    expect(getActiveLeagueDate(new Date('2026-07-29T12:20:00Z'))).toBe('2026-07-30')
  })

  it('월말 21:30이면 다음달 1일로 넘어간다', () => {
    // 21:30 KST (31일) → 8/1
    expect(getActiveLeagueDate(new Date('2026-07-31T12:30:00Z'))).toBe('2026-08-01')
  })
})

describe('isPredictionWindowOpen', () => {
  it('21:20 정각부터 접수 가능', () => {
    expect(isPredictionWindowOpen(new Date('2026-07-29T12:20:00Z'))).toBe(true)
  })

  it('21:19는 아직 접수 불가(선정 전)', () => {
    expect(isPredictionWindowOpen(new Date('2026-07-29T12:19:00Z'))).toBe(false)
  })

  it('새벽 03:00은 접수 가능', () => {
    expect(isPredictionWindowOpen(new Date('2026-07-29T18:00:00Z'))).toBe(true)
  })

  it('07:59는 접수 가능, 08:00 마감부터 불가', () => {
    expect(isPredictionWindowOpen(new Date('2026-07-29T22:59:00Z'))).toBe(true)
    expect(isPredictionWindowOpen(new Date('2026-07-29T23:00:00Z'))).toBe(false)
  })

  it('장중 14:00은 접수 불가', () => {
    expect(isPredictionWindowOpen(new Date('2026-07-29T05:00:00Z'))).toBe(false)
  })
})
