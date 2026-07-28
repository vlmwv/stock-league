// useScenarioChart: 시나리오 게임(scenario-game/[id].vue) SVG 캔들 차트의 좌표·스케일·색상 계산.
// 화면에 노출되는 캔들 배열(visibleCandles)을 주입받아 순수 렌더링 헬퍼를 제공한다.
export const useScenarioChart = (visibleCandles: Ref<any[]>) => {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  // 차트 스케일 상수
  const chartWidth = 340
  const chartHeight = 180
  const volumeHeight = 50
  const paddingLeft = 12
  const paddingRight = 48
  const plotWidth = chartWidth - paddingLeft - paddingRight

  // 호버 중인 캔들 인덱스
  const hoveredIndex = ref<number | null>(null)

  const minMax = computed(() => {
    const candles = visibleCandles.value
    if (candles.length === 0) return { min: 0, max: 100 }
    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const max = Math.max(...highs)
    const min = Math.min(...lows)
    const buffer = (max - min) * 0.1 || 10
    return { min: min - buffer, max: max + buffer }
  })

  const priceLabels = computed(() => {
    const { min, max } = minMax.value
    return {
      y75: Math.round(max - 0.25 * (max - min)),
      y50: Math.round(max - 0.5 * (max - min)),
      y25: Math.round(max - 0.75 * (max - min))
    }
  })

  const getX = (index: number) => {
    const total = visibleCandles.value.length
    const step = plotWidth / Math.max(total, 10)
    return paddingLeft + index * step + step / 2
  }

  const getY = (price: number) => {
    const { min, max } = minMax.value
    return chartHeight - ((price - min) / (max - min)) * chartHeight
  }

  const getVolumeY = (volume: number) => {
    const volumes = visibleCandles.value.map(c => c.volume)
    const maxVol = Math.max(...volumes) || 1
    return volumeHeight - (volume / maxVol) * volumeHeight
  }

  // 당일 시가 대비 당일 종가 기준으로 색상을 결정하는 헬퍼 함수 (양봉/음봉)
  const getCandleColor = (index: number) => {
    const candles = visibleCandles.value
    if (candles.length === 0 || !candles[index]) return '#ef4444'
    return candles[index].close >= candles[index].open ? '#ef4444' : '#3b82f6'
  }

  const getVolumeColor = (index: number) => {
    const candles = visibleCandles.value
    if (candles.length === 0 || !candles[index]) return 'rgba(239,68,68,0.45)'
    return candles[index].close >= candles[index].open ? 'rgba(239,68,68,0.45)' : 'rgba(59,130,246,0.45)'
  }

  const activeCandle = computed(() => {
    if (hoveredIndex.value !== null && visibleCandles.value[hoveredIndex.value]) {
      return visibleCandles.value[hoveredIndex.value]
    }
    return visibleCandles.value[visibleCandles.value.length - 1]
  })

  const activeCandleIndex = computed(() => {
    if (hoveredIndex.value !== null) return hoveredIndex.value
    return visibleCandles.value.length - 1
  })

  const activeCandleColorClass = computed(() => {
    const index = activeCandleIndex.value
    const candles = visibleCandles.value
    if (candles.length === 0 || !candles[index]) return 'text-rose-400'
    return candles[index].close >= candles[index].open ? 'text-rose-400' : 'text-blue-400'
  })

  return {
    isDark,
    chartWidth,
    chartHeight,
    volumeHeight,
    plotWidth,
    hoveredIndex,
    priceLabels,
    getX,
    getY,
    getVolumeY,
    getCandleColor,
    getVolumeColor,
    activeCandle,
    activeCandleIndex,
    activeCandleColorClass
  }
}
