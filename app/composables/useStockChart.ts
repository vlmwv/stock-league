// useStockChart: 종목 상세(stocks/[code].vue) 라인(종가)/캔들/거래량 차트의 시리즈·옵션·주석을 구성한다.
// 시세 이력·AI 추천 이력·뉴스·마커 토글·차트 유형·표시 기간을 주입받아 ApexCharts용 computed를 반환한다.
export const useStockChart = (params: {
  priceHistory: Ref<any[]>
  aiHistory: Ref<any[]>
  news: Ref<any[]>
  showMarkers: Ref<boolean>
  chartType: Ref<'line' | 'candle'>
  periodDays: Ref<number>
}) => {
  const { priceHistory, aiHistory, news, showMarkers, chartType, periodDays } = params
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  const latestTargetPrice = computed(() => {
    if (aiHistory.value.length === 0) return null
    // 가장 최근 추천 정보의 목표가를 가져옴
    return aiHistory.value[0]?.target_price || null
  })

  // 기간 탭(1주/1달/3달)에 맞춰 표시할 이력만 추림 (가장 최근 데이터 날짜 기준 달력일 컷오프)
  const visibleHistory = computed(() => {
    if (priceHistory.value.length === 0) return []
    const latest = new Date(priceHistory.value[0].price_date).getTime()
    const cutoff = latest - periodDays.value * 24 * 60 * 60 * 1000
    return priceHistory.value.filter(h => new Date(h.price_date).getTime() >= cutoff)
  })

  // 표시 구간의 등락 방향 — 라인 색상 연동 (상승 빨강 / 하락 파랑)
  const isTrendUp = computed(() => {
    const rows = visibleHistory.value
    if (rows.length < 2) return true
    const first = resolveOhlc(rows[rows.length - 1]).close
    const last = resolveOhlc(rows[0]).close
    return last >= first
  })
  const lineColor = computed(() => (isTrendUp.value ? '#ef4444' : '#3b82f6'))

  const chartSeries = computed(() => {
    if (visibleHistory.value.length === 0) return []
    const dataForChart = [...visibleHistory.value].reverse()
    if (chartType.value === 'line') {
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
    if (visibleHistory.value.length === 0) return []
    const dataForChart = [...visibleHistory.value].reverse()
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

    // 1. 목표가 표시 (가장 최근 추천 기준, 점선)
    if (latestTargetPrice.value) {
      ann.yaxis.push({
        y: latestTargetPrice.value,
        borderColor: '#10b981', // Emerald 500
        strokeDashArray: 4,
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
          text: `🎯 목표가 ${latestTargetPrice.value.toLocaleString()}원`
        }
      })
    }

    // 2. 추천 시점 및 추천가 표시 (차트 범위 내)
    //    라인 모드에서는 포인트 마커만 작게 표시하고, 캔들 모드에서는 세로선+라벨까지 표시한다.
    if (visibleHistory.value.length > 0 && aiHistory.value.length > 0) {
      const dates = visibleHistory.value.map(h => h.price_date)
      const minDate = dates[dates.length - 1]
      const maxDate = dates[0]
      const isLine = chartType.value === 'line'

      aiHistory.value.forEach(item => {
        if (item.game_date >= minDate && item.game_date <= maxDate) {
          const timestamp = new Date(item.game_date).getTime()

          // 세로선 (추천 시점) — 캔들 모드에서만
          if (!isLine) {
            ann.xaxis.push({
              x: timestamp,
              borderColor: '#6366f1', // Indigo 500
              strokeDashArray: 0, // 실선
              borderWidth: 2,
              label: {
                borderColor: '#6366f1',
                orientation: 'horizontal',
                offsetY: 0,
                style: {
                  color: '#fff',
                  background: '#6366f1',
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: { left: 8, right: 8, top: 4, bottom: 4 }
                },
                text: '✨ AI 추천'
              }
            })
          }

          // 포인트 (추천가)
          if (item.rec_price) {
            ann.points.push({
              x: timestamp,
              y: item.rec_price,
              marker: {
                size: isLine ? 4 : 6,
                fillColor: '#ffffff',
                strokeColor: '#6366f1',
                strokeWidth: 3,
                shape: "circle",
                radius: 4,
              },
              label: {
                borderColor: '#6366f1',
                offsetY: -5,
                style: {
                  color: '#fff',
                  background: '#6366f1',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: { left: 5, right: 5, top: 2, bottom: 2 }
                },
                text: isLine ? 'AI' : `추천가 ${item.rec_price.toLocaleString()}원`
              }
            })
          }
        }
      })
    }

    // 3. 주요 뉴스/이슈 마커 추가 (캔들 모드 + 마커 체크박스가 켜져 있고 뉴스가 로드되었을 때)
    if (chartType.value === 'candle' && showMarkers.value && news.value.length > 0 && visibleHistory.value.length > 0) {
      const dates = visibleHistory.value.map(h => h.price_date)
      const minDate = dates[dates.length - 1]
      const maxDate = dates[0]

      // 날짜별 시세 정보 맵핑
      const priceMap = new Map<string, any>()
      visibleHistory.value.forEach(h => {
        priceMap.set(h.price_date, h)
      })

      // 차트 범위 내 뉴스 필터링
      const filteredNews = news.value.filter(item => {
        if (!item.published_at) return false
        const newsDateStr = item.published_at.substring(0, 10)
        return newsDateStr >= minDate && newsDateStr <= maxDate
      })

      // 날짜별 뉴스 그룹핑
      const newsByDate = new Map<string, any[]>()
      filteredNews.forEach(item => {
        const dateStr = item.published_at.substring(0, 10)
        if (!newsByDate.has(dateStr)) {
          newsByDate.set(dateStr, [])
        }
        newsByDate.get(dateStr)!.push(item)
      })

      // 날짜별 마커 및 텍스트 생성
      newsByDate.forEach((items, dateStr) => {
        const historyItem = priceMap.get(dateStr)
        if (!historyItem) return

        const timestamp = new Date(dateStr).getTime()
        const high = historyItem.high_price !== null && historyItem.high_price !== undefined ? historyItem.high_price : historyItem.close_price

        items.forEach((news, index) => {
          // 최대 3개까지만 차트에 표시하여 너무 도배되지 않도록 함
          if (index >= 3) return

          const priceScale = high > 0 ? high : 10000
          const offsetPercent = 0.035 + (index * 0.045) // 3.5%, 8%, 12.5% 순으로 위로 띄움
          const yValue = high + (priceScale * offsetPercent)

          const title = news.title || ''
          const isPositive = /상승|급등|호재|실적|기대|최대|돌파|수혜|흑자|AI|신제품|상한가/i.test(title)
          const isNegative = /하락|급락|악재|적자|우려|부진|감소|소송|하한가/i.test(title)

          let textColor = '#22c55e' // 기본 초록 (Green 500)
          const bgColor = isDark.value ? '#0f172a' : '#f8fafc'
          let borderColor = '#22c55e'

          if (isPositive) {
            textColor = '#f87171' // 빨강 (Red 400)
            borderColor = '#f87171'
          } else if (isNegative) {
            textColor = '#60a5fa' // 파랑 (Blue 400)
            borderColor = '#60a5fa'
          }

          ann.points.push({
            x: timestamp,
            y: yValue,
            marker: {
              size: 3,
              fillColor: textColor,
              strokeColor: '#0f172a',
              strokeWidth: 1,
              shape: 'circle'
            },
            label: {
              borderColor: borderColor,
              borderWidth: 1,
              borderRadius: 6,
              textAnchor: 'middle',
              offsetX: 0,
              offsetY: -3,
              style: {
                color: textColor,
                background: bgColor,
                fontSize: '8px',
                fontWeight: 700,
                padding: { left: 5, right: 5, top: 2.5, bottom: 2.5 }
              },
              text: title.length > 16 ? title.substring(0, 14) + '...' : title
            }
          })
        })
      })
    }

    return ann
  })

  const chartOptions = computed(() => {
    const isLine = chartType.value === 'line'
    return {
    chart: {
      id: 'stock-candlestick',
      group: 'stock-charts',
      type: isLine ? 'area' : 'candlestick',
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
        show: !isLine,
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
        enabled: !isLine,
        type: 'x',
        autoScaleYaxis: true
      },
      sparkline: { enabled: false },
      background: 'transparent',
      fontFamily: 'Pretendard, Inter, sans-serif'
    },
    dataLabels: {
      enabled: false
    },
    ...(isLine
      ? {
          colors: [lineColor.value],
          stroke: { curve: 'straight' as const, width: 2.5 },
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
      y: isLine
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
    }
  })

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
        formatter: () => '',
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

  return { chartSeries, volumeSeries, chartAnnotations, chartOptions, volumeChartOptions }
}
