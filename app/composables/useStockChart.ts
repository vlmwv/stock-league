// useStockChart: 종목 상세(stocks/[code].vue) 라인(종가)·캔들/거래량 차트의 시리즈·옵션·주석을 구성한다.
// 시세 이력·AI 추천 이력·뉴스·마커 토글·차트 유형을 주입받아 ApexCharts용 computed를 반환한다.
export const useStockChart = (params: {
  priceHistory: Ref<any[]>
  aiHistory: Ref<any[]>
  news: Ref<any[]>
  showMarkers: Ref<boolean>
  chartRange: Ref<number>
  chartType: Ref<'line' | 'candle'>
}) => {
  const { priceHistory, aiHistory, news, showMarkers, chartRange, chartType } = params
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  // 시세 이력은 최신순으로 수신된다. 선택한 기간만 모든 차트 요소에 공통 적용한다.
  const visiblePriceHistory = computed(() => priceHistory.value.slice(0, chartRange.value))

  const isLine = computed(() => chartType.value === 'line')

  // 표시 구간의 첫 종가 대비 마지막 종가로 라인 색상을 연동한다 (상승 빨강 / 하락 파랑)
  const lineColor = computed(() => {
    const rows = visiblePriceHistory.value
    if (rows.length < 2) return '#ef4444'
    const first = resolveOhlc(rows[rows.length - 1]).close
    const last = resolveOhlc(rows[0]).close
    return last >= first ? '#ef4444' : '#3b82f6'
  })

  const latestTargetPrice = computed(() => {
    if (aiHistory.value.length === 0) return null
    // 가장 최근 추천 정보의 목표가를 가져옴
    return aiHistory.value[0]?.target_price || null
  })

  // AI 추천 마커: 차트 범위 내 추천 이력 (차트 점 표시·하단 상세 리스트 공용)
  const aiMarkers = computed(() => {
    if (visiblePriceHistory.value.length === 0 || aiHistory.value.length === 0) return []
    const dates = visiblePriceHistory.value.map(h => h.price_date)
    const minDate = dates[dates.length - 1]
    const maxDate = dates[0]
    return aiHistory.value.filter(item => item.game_date >= minDate && item.game_date <= maxDate)
  })

  // 뉴스 마커: 차트 범위 내 뉴스를 날짜별로 묶어 번호를 매겨 반환 (차트 번호 배지·하단 상세 리스트 공용)
  const newsMarkers = computed(() => {
    if (!showMarkers.value || news.value.length === 0 || visiblePriceHistory.value.length === 0) return []
    const dates = visiblePriceHistory.value.map(h => h.price_date)
    const minDate = dates[dates.length - 1]
    const maxDate = dates[0]

    // 날짜별 시세 정보 맵핑
    const priceMap = new Map<string, any>()
    visiblePriceHistory.value.forEach(h => {
      priceMap.set(h.price_date, h)
    })

    // 차트 범위 내 뉴스를 날짜별로 그룹핑
    const newsByDate = new Map<string, any[]>()
    news.value.forEach(item => {
      if (!item.published_at) return
      const dateStr = item.published_at.substring(0, 10)
      if (dateStr < minDate || dateStr > maxDate) return
      if (!priceMap.has(dateStr)) return
      if (!newsByDate.has(dateStr)) {
        newsByDate.set(dateStr, [])
      }
      newsByDate.get(dateStr)!.push(item)
    })

    // 날짜 오름차순(차트 왼쪽→오른쪽)으로 날짜당 배지 하나씩 번호를 매김
    const markers: any[] = []
    let num = 0
    ;[...newsByDate.keys()].sort().forEach(dateStr => {
      const historyItem = priceMap.get(dateStr)
      const high = historyItem.high_price !== null && historyItem.high_price !== undefined ? historyItem.high_price : historyItem.close_price
      num += 1

      // 최대 3개까지만 표시하여 너무 도배되지 않도록 함
      const items = newsByDate.get(dateStr)!.slice(0, 3).map(item => {
        const title = item.title || ''
        const isPositive = /상승|급등|호재|실적|기대|최대|돌파|수혜|흑자|AI|신제품|상한가/i.test(title)
        const isNegative = /하락|급락|악재|적자|우려|부진|감소|소송|하한가/i.test(title)
        const color = isPositive ? '#f87171' : isNegative ? '#60a5fa' : '#22c55e'
        return { title, color, item }
      })

      markers.push({ num, dateStr, high, close: resolveOhlc(historyItem).close, items })
    })
    return markers
  })

  const chartSeries = computed(() => {
    if (visiblePriceHistory.value.length === 0) return []
    const dataForChart = [...visiblePriceHistory.value].reverse()
    if (isLine.value) {
      return [{
        name: '종가',
        data: dataForChart.map(h => ({
          x: new Date(h.price_date).getTime(),
          y: resolveOhlc(h).close
        }))
      }]
    }
    return [{
      name: '시세',
      data: dataForChart.map(h => {
        const { open, high, low, close } = resolveOhlc(h)
        return {
          x: new Date(h.price_date).getTime(),
          y: [open, high, low, close]
        }
      })
    }]
  })

  const volumeSeries = computed(() => {
    if (visiblePriceHistory.value.length === 0) return []
    const dataForChart = [...visiblePriceHistory.value].reverse()
    return [{
      name: '거래량',
      data: dataForChart.map(h => {
        const { open, close } = resolveOhlc(h)
        const isUp = close >= open
        return {
          x: new Date(h.price_date).getTime(),
          y: h.volume || 0,
          fillColor: isUp ? '#ef4444' : '#3b82f6'
        }
      })
    }]
  })

  const chartAnnotations = computed(() => {
    const ann: any = {
      yaxis: [],
      xaxis: [],
      points: []
    }

    // 1. 목표가 표시 (가장 최근 추천 기준)
    if (latestTargetPrice.value) {
      ann.yaxis.push({
        y: latestTargetPrice.value,
        borderColor: '#10b981', // Emerald 500
        strokeDashArray: 4, // 점선: 실제 시세(캔들)와 구분되는 기준선임을 드러낸다
        borderWidth: 2,
        label: {
          borderColor: '#10b981',
          position: 'right',
          offsetX: -10,
          style: {
            color: '#fff',
            background: '#10b981',
            fontSize: '11px',
            fontWeight: 900,
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
          },
          text: `목표 ${latestTargetPrice.value.toLocaleString()}`
        }
      })
    }

    // 2. 추천 시점 표시: 세로선·텍스트 라벨 없이 추천가 위치에 점 하나만 찍고, 상세는 차트 하단 리스트에서 보여준다
    aiMarkers.value.forEach(item => {
      if (!item.rec_price) return
      ann.points.push({
        x: new Date(item.game_date).getTime(),
        y: item.rec_price,
        marker: {
          size: 5,
          fillColor: '#6366f1', // Indigo 500
          strokeColor: '#ffffff',
          strokeWidth: 2,
          shape: 'circle'
        }
      })
    })

    // 3. 뉴스 마커: 제목 라벨 대신 날짜당 번호 배지 하나만 표시하고, 제목은 차트 하단 리스트에서 번호로 매칭해 보여준다
    newsMarkers.value.forEach(m => {
      // 라인 모드는 종가 기준 축이라 고가 기준으로 띄우면 배지가 축 밖으로 잘린다
      const basePrice = isLine.value ? m.close : m.high
      const priceScale = basePrice > 0 ? basePrice : 10000
      const offsetPercent = 0.04 + (m.num % 3) * 0.055 // 이웃 날짜 배지가 겹치지 않게 3단 지그재그 배치
      const yValue = basePrice + (priceScale * offsetPercent)

      ann.points.push({
        x: new Date(m.dateStr).getTime(),
        y: yValue,
        marker: { size: 0 },
        label: {
          borderColor: '#f59e0b',
          borderWidth: 0,
          borderRadius: 8,
          textAnchor: 'middle',
          offsetX: 0,
          offsetY: 0,
          style: {
            color: '#fff',
            background: '#f59e0b', // Amber 500
            fontSize: '9px',
            fontWeight: 900,
            padding: { left: 5, right: 5, top: 2, bottom: 2 }
          },
          text: String(m.num)
        }
      })
    })

    return ann
  })

  const chartOptions = computed(() => ({
    chart: {
      id: 'stock-candlestick',
      group: 'stock-charts',
      type: isLine.value ? 'area' : 'candlestick',
      locales: [{
        name: 'ko',
        options: {
          months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
          shortMonths: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
          days: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
          shortDays: ['일', '월', '화', '수', '목', '금', '토'],
          toolbar: {
            download: '이미지 다운로드',
            selection: '선택 영역',
            selectionZoom: '선택 영역 확대',
            zoomIn: '확대',
            zoomOut: '축소',
            pan: '이동',
            reset: '원래대로'
          }
        }
      }],
      defaultLocale: 'ko',
      toolbar: {
        show: !isLine.value,
        tools: {
          download: false,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        },
        autoSelected: 'zoom'
      },
      zoom: {
        enabled: !isLine.value,
        type: 'x',
        autoScaleYaxis: true
      },
      sparkline: { enabled: false },
      background: 'transparent',
      fontFamily: 'Pretendard, Inter, sans-serif'
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: { toolbar: { show: false } },
        yaxis: { labels: { minWidth: 50, maxWidth: 50 } }
      }
    }],
    dataLabels: {
      enabled: false
    },
    // 라인(영역) 모드 전용: 등락 색상 연동 + 아래쪽 옅은 그라데이션
    ...(isLine.value
      ? {
          colors: [lineColor.value],
          stroke: { curve: 'straight', width: 2.5 },
          fill: { type: 'gradient', gradient: { shadeIntensity: 0, opacityFrom: 0.25, opacityTo: 0, stops: [0, 100] } },
          markers: { size: 0, hover: { size: 5 } }
        }
      : {}),
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#ef4444',
          downward: '#3b82f6'
        },
        wick: {
          useFillColor: true
        }
      }
    },
    grid: {
      show: true,
      borderColor: isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)',
      strokeDashArray: 4,
      padding: { left: -10, right: 0, top: 0, bottom: 0 }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        show: false // 상단 차트에서는 X축 라벨 숨김 (하단 거래량 차트에만 표시)
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: true,
        position: 'back',
        stroke: {
          color: '#6366f1',
          width: 1,
          dashArray: 4,
        },
      }
    },
    yaxis: {
      show: true,
      opposite: true,
      labels: {
        style: {
          colors: isDark.value ? '#64748b' : '#475569',
          fontSize: '10px',
          fontWeight: 600
        },
        formatter: (val: number) => {
          if (val >= 100000000) return (val / 100000000).toLocaleString() + '억'
          if (val >= 10000) return (val / 10000).toLocaleString() + '만'
          if (val >= 1000) return (val / 1000).toLocaleString() + '천'
          return val.toLocaleString()
        },
        minWidth: 65, // Y축 너비 고정하여 하단 차트와 완벽 매칭
        maxWidth: 65
      }
    },
    tooltip: {
      theme: isDark.value ? 'dark' : 'light',
      x: { format: 'MM월 dd일' },
      y: isLine.value
        ? {
            formatter: (val: number) => `${val?.toLocaleString()}원`,
            title: { formatter: () => '종가' }
          }
        : {
            title: {
              formatter: (seriesName: any) => {
                if (seriesName === 'Open') return '시가'
                if (seriesName === 'High') return '고가'
                if (seriesName === 'Low') return '저가'
                if (seriesName === 'Close') return '종가'
                return seriesName
              }
            }
          },
      style: {
        fontSize: '10px'
      }
    },
    annotations: chartAnnotations.value
  }))

  const volumeChartOptions = computed(() => ({
    chart: {
      id: 'stock-volume',
      group: 'stock-charts',
      type: 'bar',
      toolbar: { show: false },
      sparkline: { enabled: false },
      background: 'transparent',
      fontFamily: 'Pretendard, Inter, sans-serif'
    },
    responsive: [{
      breakpoint: 480,
      options: {
        yaxis: { labels: { minWidth: 50, maxWidth: 50 } }
      }
    }],
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      bar: {
        columnWidth: '80%',
        colors: {
          ranges: [
            { from: 0, to: 0, color: undefined }
          ]
        }
      }
    },
    grid: {
      show: true,
      borderColor: isDark.value ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)',
      strokeDashArray: 4,
      padding: { left: -10, right: 0, top: 0, bottom: 0 }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        show: true,
        style: {
          colors: isDark.value ? '#64748b' : '#475569',
          fontSize: '10px',
          fontWeight: 600
        },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: true,
        position: 'back',
        stroke: {
          color: '#6366f1',
          width: 1,
          dashArray: 4,
        },
      }
    },
    yaxis: {
      show: true,
      opposite: true,
      labels: {
        style: {
          colors: isDark.value ? '#64748b' : '#475569',
          fontSize: '10px',
          fontWeight: 600
        },
        formatter: (value: number) => formatVolume(value), // 조/억/만 축약 표기
        minWidth: 65, // Y축 너비 고정하여 상단 차트와 완벽 매칭
        maxWidth: 65
      }
    },
    tooltip: {
      theme: isDark.value ? 'dark' : 'light',
      x: { format: 'MM월 dd일' },
      y: {
        title: {
          formatter: (seriesName: any) => {
            if (seriesName === 'Volume' || seriesName === '거래량') return '거래량'
            return seriesName
          }
        }
      },
      style: {
        fontSize: '10px'
      }
    }
  }))

  return { chartSeries, volumeSeries, chartAnnotations, chartOptions, volumeChartOptions, aiMarkers, newsMarkers, latestTargetPrice }
}
