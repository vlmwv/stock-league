/**
 * 종목 코드에 따라 네이버 금융 뉴스 페이지 URL을 반환합니다.
 * @param code 종목 코드 (KOSPI 6자리 숫자 또는 해외 티커)
 * @returns 네이버 금융 상세 페이지 URL
 */
export const getNewsUrl = (code: string): string => {
  if (!code) return 'https://m.stock.naver.com'
  
  // 한국 종목은 6자리 숫자 패턴
  const isKoreanStock = /^[0-9]{6}$/.test(code)
  
  if (isKoreanStock) {
    return `https://m.stock.naver.com/domestic/stock/${code}/news`
  } else {
    // 해외 종목 (나스닥 등)
    return `https://m.stock.naver.com/worldstock/stock/${code}/news`
  }
}

/**
 * 이미 생성된 URL이 잘못된 패턴(/item/)인 경우 보정합니다.
 * @param url 원본 URL
 * @param code 종목 코드 (필요시)
 * @returns 보정된 URL
 */
export const repairNewsUrl = (url: string, code?: string): string => {
  if (!url) return getNewsUrl(code || '')
  
  // 잘못된 /item/ 패턴을 감지하여 /domestic/stock/ 혹은 /worldstock/stock/으로 변경
  if (url.includes('m.stock.naver.com/item/')) {
    const extractedCode = url.match(/\/item\/([^/]+)/)?.[1] || code
    if (extractedCode) {
      return getNewsUrl(extractedCode)
    }
  }
  
  return url
}

/**
 * HTML 엔티티(예: &quot;, &amp;)를 실제 문자로 변환합니다.
 * @param str 변환할 문자열
 * @returns 변환된 문자열
 */
export const decodeHtmlEntities = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * 종목명이 ETF인지 여부를 확인합니다.
 * @param name 종목명
 * @returns ETF 여부
 */
export const isEtf = (name: string): boolean => {
  const etfKeywords = [
    'ETF', 'ETN', 'KODEX', 'TIGER', 'KBSTAR', 'ACE', 'SOL', 'ARIRANG', 
    'HANARO', 'KOSEF', 'RISE', 'PLUS', 'TIMEFOLIO', 'WOORI', 'HI', 
    'UNIPLAT', 'HANA', 'KOSEF'
  ]
  const upperName = (name || '').toUpperCase()
  return etfKeywords.some(keyword => upperName.includes(keyword))
}

/**
 * 종목 코드 또는 섹터에 따라 고정된 테마 이미지 경로를 반환합니다.
 * @param code 종목 코드
 * @param sector 섹터명
 * @returns 이미지 파일 경로
 */
export const getStockImage = (code: string, sector?: string): string => {
  // 1. 특정 종목 코드 매칭 (예: 한화에어로스페이스)
  if (code === '012450') return '/images/stocks/hero_012450.png'
  
  // 2. 섹터 키워드 매칭
  const s = (sector || '').toLowerCase()
  if (s.includes('반도체')) return '/images/stocks/sector_semiconductor.png'
  if (s.includes('자동차') || s.includes('전기차')) return '/images/stocks/sector_automobile.png'
  if (s.includes('금융') || s.includes('보험') || s.includes('은행') || s.includes('증권')) return '/images/stocks/sector_finance.png'
  if (s.includes('바이오') || s.includes('제약') || s.includes('의료')) return '/images/stocks/sector_bio.png'
  if (s.includes('에너지') || s.includes('배터리') || s.includes('전지') || s.includes('화학')) return '/images/stocks/sector_energy.png'
  if (s.includes('우주') || s.includes('항공')) return '/images/stocks/hero_012450.png' // 한화에어로 이미지를 항공우주 공용으로 활용

  // 3. 기본 이미지 (랜덤 또는 섹터 기반 해시)
  const defaultImages = [
    '/images/stocks/sector_finance.png',
    '/images/stocks/sector_semiconductor.png',
    '/images/stocks/sector_energy.png'
  ]
  const charCodeSum = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return defaultImages[charCodeSum % defaultImages.length]
}
