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

  const getCandleIndexAtX = (x: number) => {
    const total = visibleCandles.value.length
    if (total === 0) return null
    const step = plotWidth / Math.max(total, 10)
    return Math.min(total - 1, Math.max(0, Math.floor((x - paddingLeft) / step)))
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

  // 활성 캔들의 전일 종가 대비 등락 (시세판 규칙: 상승/하락을 전일 종가 기준으로 표시)
  // 전일 데이터가 없는 첫 캔들은 null을 반환한다.
  const activeCandleChange = computed(() => {
    const candles = visibleCandles.value
    const index = activeCandleIndex.value
    const cur = candles[index]
    if (!cur || index <= 0) return null
    const prevClose = candles[index - 1].close
    const diff = cur.close - prevClose
    const rate = prevClose !== 0 ? (diff / prevClose) * 100 : 0
    return { diff, rate }
  })

  // 전일대비 색상 (상승=빨강, 하락=파랑, 보합=회색)
  const activeChangeColorClass = computed(() => {
    const change = activeCandleChange.value
    if (!change || change.diff === 0) return 'text-slate-400'
    return change.diff > 0 ? 'text-rose-400' : 'text-blue-400'
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
    getCandleIndexAtX,
    getY,
    getVolumeY,
    getCandleColor,
    getVolumeColor,
    activeCandle,
    activeCandleIndex,
    activeCandleColorClass,
    activeCandleChange,
    activeChangeColorClass
  }
}
