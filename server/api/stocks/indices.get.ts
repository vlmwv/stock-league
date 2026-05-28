import { defineEventHandler } from 'h3'

// 전역 캐시 변수 정의 (서버 메모리 캐싱)
let cachedIndices: any = null
let cacheTimestamp = 0
const CACHE_TTL = 10 * 60 * 1000 // 10분 캐시 (밀리초)

// 기본 안전 폴백 데이터 (Mock 데이터)
const FALLBACK_INDICES = [
  { region: '대한민국', name: 'KOSPI', symbol: 'KS11', value: 2654.21, changeRate: 1.20 },
  { region: '대한민국', name: 'KOSDAQ', symbol: 'KQ11', value: 875.40, changeRate: -0.40 },
  { region: '미국', name: 'S&P 500', symbol: 'GSPC', value: 5137.08, changeRate: 0.85 },
  { region: '미국', name: 'NASDAQ', symbol: 'IXIC', value: 16274.94, changeRate: 1.14 },
  { region: '미국', name: 'Dow Jones', symbol: 'DJI', value: 39087.38, changeRate: 0.23 }
]

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // .env 또는 시스템 환경변수에서 API 키를 읽어옵니다.
  const apiKey = process.env.NUXT_TWELVE_DATA_API_KEY || config.twelveDataApiKey

  // 1. 캐시가 유효한지 확인하고 캐시된 데이터를 반환합니다.
  const now = Date.now()
  if (cachedIndices && (now - cacheTimestamp < CACHE_TTL)) {
    console.log('[Indices API] 캐시 메모리에서 실시간 지수 정보를 즉시 반환합니다.')
    return {
      success: true,
      source: cachedIndices.source, // 'api' 또는 'fallback'
      data: cachedIndices.data,
      cachedAt: new Date(cacheTimestamp).toISOString()
    }
  }

  // 2. API 키가 등록되어 있지 않은 경우, 목업 데이터를 폴백으로 즉시 반환합니다.
  if (!apiKey) {
    console.warn('[Indices API] Twelve Data API Key가 설정되지 않았습니다. 목업 데이터를 폴백 반환합니다.')
    const fallbackResult = {
      success: true,
      source: 'fallback',
      data: FALLBACK_INDICES.map(({ symbol, ...rest }) => rest)
    }
    // API 키가 아예 없을 때도 일단 가벼운 캐싱을 적용하여 무분별한 연산을 줄입니다.
    cachedIndices = fallbackResult
    cacheTimestamp = now
    return fallbackResult
  }

  try {
    const symbols = FALLBACK_INDICES.map(item => item.symbol).join(',')
    const url = `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${apiKey}`

    console.log(`[Indices API] Twelve Data 외부 API 호출 중: ${symbols}`)
    const response: any = await $fetch(url, {
      method: 'GET',
      parseResponse: JSON.parse
    })

    // Twelve Data API는 호출 제한이나 키 오류 시 상태코드 200에 에러 필드를 얹어 보냅니다.
    if (response.status === 'error' || response.code === 400 || response.code === 401 || response.code === 429) {
      throw new Error(response.message || 'Twelve Data API 응답 오류 발생')
    }

    // 결과 데이터를 조립합니다.
    const updatedData = FALLBACK_INDICES.map(item => {
      const apiInfo = response[item.symbol]
      
      // 개별 심볼 응답이 있고 정상 데이터인 경우 값을 업데이트합니다.
      if (apiInfo && apiInfo.close && apiInfo.percent_change) {
        const value = parseFloat(apiInfo.close)
        const changeRate = parseFloat(apiInfo.percent_change)
        
        return {
          region: item.region,
          name: item.name,
          value: isNaN(value) ? item.value : value,
          changeRate: isNaN(changeRate) ? item.changeRate : parseFloat(changeRate.toFixed(2))
        }
      }
      
      // 특정 심볼의 호출이 잘 안되었을 경우 기존 목업 항목을 그대로 유지하여 견고함을 더합니다.
      return {
        region: item.region,
        name: item.name,
        value: item.value,
        changeRate: item.changeRate
      }
    })

    const apiResult = {
      success: true,
      source: 'api',
      data: updatedData
    }

    // 서버 메모리에 캐시를 저장합니다.
    cachedIndices = apiResult
    cacheTimestamp = now

    console.log('[Indices API] 실제 금융 API로부터 데이터를 성공적으로 갱신하고 캐시를 저장했습니다.')
    return apiResult

  } catch (error: any) {
    console.error('[Indices API] 외부 지수 API 갱신 중 예외가 발생했습니다:', error.message || error)

    // 통신 오류나 API 한도 초과 시, 사용자 화면이 마비되지 않도록 기존 목업 데이터를 즉시 폴백 반환합니다.
    const errorFallbackResult = {
      success: true,
      source: 'fallback',
      data: FALLBACK_INDICES.map(({ symbol, ...rest }) => rest)
    }

    // 오류 시에는 짧게 1분 동안만 캐싱하여 일시적 에러 회복 속도를 빠르게 유도합니다.
    cachedIndices = errorFallbackResult
    cacheTimestamp = now - CACHE_TTL + (60 * 1000)

    return errorFallbackResult
  }
})
