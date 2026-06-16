import { describe, it, expect } from 'vitest'
import {
  isEtf,
  cleanLlmSummary,
  decodeHtmlEntities,
  getNewsUrl,
  repairNewsUrl
} from '../../app/utils/stock'

describe('isEtf', () => {
  it('ETF 키워드가 포함된 종목명은 true', () => {
    expect(isEtf('KODEX 200')).toBe(true)
    expect(isEtf('TIGER 미국S&P500')).toBe(true)
    expect(isEtf('ACE 글로벌리츠')).toBe(true)
  })

  it('대소문자를 가리지 않는다', () => {
    expect(isEtf('kodex 레버리지')).toBe(true)
  })

  it('일반 종목명은 false', () => {
    expect(isEtf('삼성전자')).toBe(false)
    expect(isEtf('SK하이닉스')).toBe(false)
  })

  it('빈 값/널은 false', () => {
    expect(isEtf('')).toBe(false)
    // @ts-expect-error 런타임 방어 동작 확인
    expect(isEtf(null)).toBe(false)
  })
})

describe('cleanLlmSummary', () => {
  it('대괄호/소괄호 GEMINI 요약 접두사를 제거한다', () => {
    expect(cleanLlmSummary('[GEMINI 요약] 반도체 업황 회복')).toBe('반도체 업황 회복')
    expect(cleanLlmSummary('(GEMINI 요약) 실적 개선')).toBe('실적 개선')
  })

  it('접두사가 없으면 trim만 적용', () => {
    expect(cleanLlmSummary('  내용  ')).toBe('내용')
  })

  it('빈 값은 빈 문자열', () => {
    expect(cleanLlmSummary('')).toBe('')
  })
})

describe('decodeHtmlEntities', () => {
  it('주요 HTML 엔티티를 실제 문자로 변환', () => {
    expect(decodeHtmlEntities('&quot;삼성&quot;')).toBe('"삼성"')
    expect(decodeHtmlEntities('A&amp;B')).toBe('A&B')
    expect(decodeHtmlEntities('&lt;tag&gt;')).toBe('<tag>')
    expect(decodeHtmlEntities('it&#039;s')).toBe("it's")
  })

  it('빈 값은 빈 문자열', () => {
    expect(decodeHtmlEntities('')).toBe('')
  })
})

describe('getNewsUrl', () => {
  it('6자리 숫자는 국내 종목 URL', () => {
    expect(getNewsUrl('005930')).toBe('https://m.stock.naver.com/domestic/stock/005930/news')
  })

  it('그 외는 해외 종목 URL', () => {
    expect(getNewsUrl('AAPL')).toBe('https://m.stock.naver.com/worldstock/stock/AAPL/news')
  })

  it('빈 코드는 기본 URL', () => {
    expect(getNewsUrl('')).toBe('https://m.stock.naver.com')
  })
})

describe('repairNewsUrl', () => {
  it('잘못된 /item/ 패턴을 보정한다', () => {
    expect(repairNewsUrl('https://m.stock.naver.com/item/005930')).toBe(
      'https://m.stock.naver.com/domestic/stock/005930/news'
    )
  })

  it('정상 URL은 그대로 둔다', () => {
    const url = 'https://m.stock.naver.com/domestic/stock/005930/news'
    expect(repairNewsUrl(url)).toBe(url)
  })

  it('빈 URL은 code 기반 기본 URL', () => {
    expect(repairNewsUrl('', '005930')).toBe('https://m.stock.naver.com/domestic/stock/005930/news')
  })
})
