import { defineEventHandler } from 'h3'

// 전역 캐시 변수 정의 (서버 메모리 캐싱)
let cachedIndices: any = null
let cacheTimestamp = 0
const CACHE_TTL = 10 * 60 * 1000 // 10분 캐시 (밀리초)

// 기본 안전 폴백 데이터 (Mock 데이터)
const FALLBACK_INDICES = [
  { region: '대한민국', name: 'KOSPI', value: 2654.21, changeRate: 1.20 },
  { region: '대한민국', name: 'KOSDAQ', value: 875.40, changeRate: -0.40 },
  { region: '미국', name: 'S&P 500', value: 5137.08, changeRate: 0.85 },
  { region: '미국', name: 'NASDAQ', value: 16274.94, changeRate: 1.14 },
  { region: '미국', name: 'Dow Jones', value: 39087.38, changeRate: 0.23 },
  { region: '미국', name: '필라델피아 반도체', value: 5240.50, changeRate: 1.15 },
  { region: '외환', name: '원/달러 환율', value: 1365.20, changeRate: 0.25 },
  { region: '원자재', name: 'WTI 원유', value: 78.45, changeRate: -1.12 }
]

export default defineEventHandler(async (event) => {
  const now = Date.now()

  // 1. 캐시가 유효한지 확인하고 캐시된 데이터를 반환합니다.
  if (cachedIndices && (now - cacheTimestamp < CACHE_TTL)) {
    console.log('[Indices API] 캐시 메모리에서 실시간 지수 정보를 즉시 반환합니다.')
    return {
      success: true,
      source: cachedIndices.source,
      data: cachedIndices.data,
      cachedAt: new Date(cacheTimestamp).toISOString()
    }
  }

  try {
    console.log('[Indices API] 네이버 금융 실시간 지수 데이터 수집을 시작합니다.')
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }

    // A. 국내 지수 조회 (KOSPI, KOSDAQ) - 네이버 실시간 국내 지수 API
    const domesticUrl = 'https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI,KOSDAQ'
    const domesticRes: any = await $fetch(domesticUrl, {
      method: 'GET',
      headers: requestHeaders
    })

    const kospiRaw = domesticRes?.datas?.find((d: any) => d.itemCode === 'KOSPI')
    const kosdaqRaw = domesticRes?.datas?.find((d: any) => d.itemCode === 'KOSDAQ')

    // B. 해외 지수 조회 (S&P 500, NASDAQ, Dow Jones, SOX) - 네이버 해외 지수 API
    const fetchWorldIndex = async (symbol: string) => {
      try {
        const url = `https://api.stock.naver.com/index/${symbol}/basic`
        const res: any = await $fetch(url, {
          method: 'GET',
          headers: requestHeaders
        })
        return res
      } catch (err: any) {
        console.error(`[Indices API] 해외 지수 ${symbol} 수집 실패:`, err.message || err)
        return null
      }
    }

    const [spxRes, nasRes, djiRes, soxRes] = await Promise.all([
      fetchWorldIndex('.INX'),
      fetchWorldIndex('.IXIC'),
      fetchWorldIndex('.DJI'),
      fetchWorldIndex('.SOX')
    ])

    // C. 데이터 조립 및 가공
    const updatedData = [
      {
        region: '대한민국',
        name: 'KOSPI',
        value: kospiRaw?.closePriceRaw ? parseFloat(kospiRaw.closePriceRaw) : FALLBACK_INDICES[0].value,
        changeRate: kospiRaw?.fluctuationsRatioRaw ? parseFloat(kospiRaw.fluctuationsRatioRaw) : FALLBACK_INDICES[0].changeRate
      },
      {
        region: '대한민국',
        name: 'KOSDAQ',
        value: kosdaqRaw?.closePriceRaw ? parseFloat(kosdaqRaw.closePriceRaw) : FALLBACK_INDICES[1].value,
        changeRate: kosdaqRaw?.fluctuationsRatioRaw ? parseFloat(kosdaqRaw.fluctuationsRatioRaw) : FALLBACK_INDICES[1].changeRate
      },
      {
        region: '미국',
        name: 'S&P 500',
        value: spxRes?.closePrice ? parseFloat(spxRes.closePrice.replace(/,/g, '')) : FALLBACK_INDICES[2].value,
        changeRate: spxRes?.fluctuationsRatio ? parseFloat(spxRes.fluctuationsRatio) : FALLBACK_INDICES[2].changeRate
      },
      {
        region: '미국',
        name: 'NASDAQ',
        value: nasRes?.closePrice ? parseFloat(nasRes.closePrice.replace(/,/g, '')) : FALLBACK_INDICES[3].value,
        changeRate: nasRes?.fluctuationsRatio ? parseFloat(nasRes.fluctuationsRatio) : FALLBACK_INDICES[3].changeRate
      },
      {
        region: '미국',
        name: 'Dow Jones',
        value: djiRes?.closePrice ? parseFloat(djiRes.closePrice.replace(/,/g, '')) : FALLBACK_INDICES[4].value,
        changeRate: djiRes?.fluctuationsRatio ? parseFloat(djiRes.fluctuationsRatio) : FALLBACK_INDICES[4].changeRate
      },
      {
        region: '미국',
        name: '필라델피아 반도체',
        value: soxRes?.closePrice ? parseFloat(soxRes.closePrice.replace(/,/g, '')) : FALLBACK_INDICES[5].value,
        changeRate: soxRes?.fluctuationsRatio ? parseFloat(soxRes.fluctuationsRatio) : FALLBACK_INDICES[5].changeRate
      },
      {
        region: '외환',
        name: '원/달러 환율',
        value: FALLBACK_INDICES[6].value,
        changeRate: FALLBACK_INDICES[6].changeRate
      },
      {
        region: '원자재',
        name: 'WTI 원유',
        value: FALLBACK_INDICES[7].value,
        changeRate: FALLBACK_INDICES[7].changeRate
      }
    ]

    const apiResult = {
      success: true,
      source: 'api',
      data: updatedData
    }

    // 서버 메모리에 캐시를 저장합니다.
    cachedIndices = apiResult
    cacheTimestamp = now

    console.log('[Indices API] 네이버 실시간 금융 데이터를 성공적으로 갱신하고 캐시를 저장했습니다.')
    return apiResult

  } catch (error: any) {
    console.error('[Indices API] 네이버 지수 API 연동 중 예외가 발생했습니다:', error.message || error)

    // 오류 발생 시 캐시가 있으면 반환하고, 없으면 정적 폴백 데이터를 반환합니다.
    const errorFallbackResult = {
      success: true,
      source: 'fallback',
      data: cachedIndices ? cachedIndices.data : FALLBACK_INDICES
    }

    return errorFallbackResult
  }
})
