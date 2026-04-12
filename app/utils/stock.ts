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

