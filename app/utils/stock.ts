/**
 * 종목 코드와 타입에 따라 네이버 금융 뉴스/공시/IR 페이지 URL을 반환합니다.
 * @param code 종목 코드 (KOSPI 6자리 숫자 또는 해외 티커)
 * @param type 정보 타입 (news, notice, ir)
 * @returns 네이버 금융 상세 페이지 URL
 */
export const getNewsUrl = (code: string, type: 'news' | 'notice' | 'ir' = 'news'): string => {
  if (!code) return 'https://m.stock.naver.com'
  
  // 한국 종목은 6자리 숫자 패턴
  const isKoreanStock = /^[0-9]{6}$/.test(code)
  
  if (isKoreanStock) {
    // 타입에 따른 경로 매핑 (공시는 notice, IR은 ir)
    const path = type === 'notice' ? 'notice' : (type === 'ir' ? 'ir' : 'news')
    return `https://m.stock.naver.com/domestic/stock/${code}/${path}`
  } else {
    // 해외 종목 (나스닥 등) - 현재는 news만 지원하는 것으로 가정
    return `https://m.stock.naver.com/worldstock/stock/${code}/news`
  }
}

/**
 * 이미 생성된 URL이 잘못된 패턴(/item/)인 경우 보정하거나 타입을 반영합니다.
 * @param url 원본 URL
 * @param code 종목 코드 (필요시)
 * @param type 정보 타입 (news, notice, ir)
 * @returns 보정된 URL
 */
export const repairNewsUrl = (url: string, code?: string, type: 'news' | 'notice' | 'ir' = 'news'): string => {
  if (!url) return getNewsUrl(code || '', type)
  
  // 타입이 명시적으로 주어졌는데 URL이 그 타입을 포함하지 않는다면 새로 생성
  const path = type === 'notice' ? 'notice' : (type === 'ir' ? 'ir' : 'news')
  if (type !== 'news' && !url.includes(`/${path}`)) {
    return getNewsUrl(code || '', type)
  }

  // 잘못된 /item/ 패턴을 감지하여 /domestic/stock/ 혹은 /worldstock/stock/으로 변경
  if (url.includes('m.stock.naver.com/item/')) {
    const extractedCode = url.match(/\/item\/([^/]+)/)?.[1] || code
    if (extractedCode) {
      return getNewsUrl(extractedCode, type)
    }
  }
  
  return url
}

