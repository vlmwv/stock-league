export interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ScenarioEvent {
  day: number
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
}

export interface Scenario {
  id: number
  title: string
  subtitle: string
  difficulty: '어려움' | '보통' | '쉬움'
  indexName: 'S&P 500' | 'KOSPI' | 'NASDAQ'
  startDate: string
  endDate: string
  description: string
  candles: CandleData[]
  events: ScenarioEvent[]
}

export const useScenario = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const scenarios = ref<Scenario[]>([
    {
      id: 1,
      title: '2008 글로벌 금융위기',
      subtitle: 'S&P 500 | 2008-09-01 ~ 2008-10-15',
      difficulty: '어려움',
      indexName: 'S&P 500',
      startDate: '2008-09-01',
      endDate: '2008-10-15',
      description: '리먼 브러더스 파산으로 시작된 역사적 금융 대폭락 시나리오. 공포의 소용돌이에서 S&P 500의 상승과 하락을 맞히고 살아남을 수 있을까요?',
      candles: Array.from({ length: 144 }, (_, i) => {
        const basePrice = 1400
        let offset = 0
        if (i < 40) {
          offset = -3 * i
        } else if (i < 80) {
          offset = -120 - 7 * (i - 40)
        } else if (i < 110) {
          offset = -400 - 15 * (i - 80)
        } else {
          offset = -850 + 8 * (i - 110)
        }
        const close = basePrice + offset + (Math.sin(i * 0.5) * 40)
        const open = close + (Math.cos(i) * 20)
        const high = Math.max(open, close) + Math.abs(Math.sin(i) * 15)
        const low = Math.min(open, close) - Math.abs(Math.cos(i) * 18)
        return {
          date: `Day ${i + 1}`,
          open: Math.round(open),
          high: Math.round(high),
          low: Math.round(low),
          close: Math.round(close),
          volume: Math.round(1500000 + Math.abs(Math.sin(i) * 1200000))
        }
      }),
      events: [
        { day: 30, title: '리먼 브러더스 파산 의혹 제기', description: '미국 4대 투자은행 리먼 브러더스의 부도 위기 루머가 월가를 덮치며 투자 심리가 급격히 냉각됩니다.', importance: 'medium' },
        { day: 65, title: '리먼 브러더스 파산 보호 신청', description: '역사상 최대 규모인 6,130억 달러의 부채를 안고 파산 신청을 단행하며 글로벌 증시가 패닉에 빠집니다.', importance: 'high' },
        { day: 85, title: 'AIG 구제금융 850억 달러 투입', description: '미 정부가 최대 보험사 AIG에 구제금융 긴급 수혈을 결정하며 증시의 소방수 역할을 시도합니다.', importance: 'medium' },
        { day: 110, title: '하원 구제금융 법안 부결 대폭락', description: '7,000억 달러 규모의 구제금융 법안이 의회에서 깜짝 부결되며 사상 초유의 하루 -7.7% 다우 폭락 사태를 맞습니다.', importance: 'high' },
        { day: 130, title: '구제금융법 최종 극적 타결', description: '수정된 구제금융 법안이 최종 통과되며 바닥을 다지고 시장이 일시적 초급반등을 개시합니다.', importance: 'medium' }
      ]
    },
    {
      id: 2,
      title: '2020 코로나 팬데믹 폭락',
      subtitle: 'KOSPI | 2020-03-02 ~ 2020-04-10',
      difficulty: '보통',
      indexName: 'KOSPI',
      startDate: '2020-03-02',
      endDate: '2020-04-10',
      description: '바이러스 공포가 전 세계 금융시장을 잠식하며 코스피가 한 달 만에 -35% 폭락 후 극적인 V자 반등을 거둔 기적의 매수 기회 시나리오입니다.',
      candles: Array.from({ length: 102 }, (_, i) => {
        const basePrice = 2150
        let offset = 0
        if (i < 40) {
          offset = -18 * i
        } else {
          offset = -720 + 12 * (i - 40)
        }
        const close = basePrice + offset + (Math.sin(i * 0.4) * 45)
        const open = close - (i < 40 ? -12 : 8) + (Math.cos(i) * 25)
        const high = Math.max(open, close) + Math.abs(Math.sin(i) * 30)
        const low = Math.min(open, close) - Math.abs(Math.cos(i) * 35)
        return {
          date: `Day ${i + 1}`,
          open: Math.round(open),
          high: Math.round(high),
          low: Math.round(low),
          close: Math.round(close),
          volume: Math.round(2500000 + Math.abs(Math.cos(i) * 1800000))
        }
      }),
      events: [
        { day: 15, title: '국내 코로나 확진자 급격한 확산', description: '지역사회 감염 우려가 폭증하면서 외국인 투매와 함께 코스피 2,000선이 붕괴됩니다.', importance: 'medium' },
        { day: 30, title: 'WHO 코로나 팬데믹 공식 선언', description: '세계보건기구가 팬데믹을 선언하며 글로벌 공급망 마비 공포에 코스피 사이드카 및 서킷브레이커가 발동됩니다.', importance: 'high' },
        { day: 40, title: '코스피 1,450선 사상 초유의 붕괴', description: '공포심이 극에 달하며 외인/기관의 무차별 패닉 셀이 출현, 코스피가 11년 전 지수로 회귀합니다.', importance: 'high' },
        { day: 60, title: '한미 600억 달러 통화스와프 체결', description: '외환시장 안정 조치로 깜짝 통화스와프가 발표되며 단숨에 지수가 반등 기틀을 마련합니다.', importance: 'medium' },
        { day: 85, title: '동학개미운동 대규모 자금 유입', description: '역사적인 초저평가 기회로 인식한 개인투자자들의 엄청난 예탁금 유입에 힘입어 지수가 빠르게 급상승합니다.', importance: 'medium' }
      ]
    },
    {
      id: 3,
      title: '2026 DeepSeek 쇼크와 AI 버블론',
      subtitle: 'NASDAQ | 2026-01-15 ~ 2026-02-25',
      difficulty: '어려움',
      indexName: 'NASDAQ',
      startDate: '2026-01-15',
      endDate: '2026-02-25',
      description: '중국 AI 모델 DeepSeek의 파괴적 가성비 발표로 엔비디아가 급락하고 빅테크의 AI 인프라 고평가 거품론이 터졌던 초긴장 상태의 나스닥 시뮬레이션입니다.',
      candles: Array.from({ length: 20 }, (_, i) => {
        const basePrice = 16200
        let offset = 0
        if (i < 8) {
          offset = -280 * i
        } else if (i < 15) {
          offset = -2240 + 200 * (i - 8)
        } else {
          offset = -840 + 30 * (i - 15)
        }
        const close = basePrice + offset + (Math.sin(i * 1.2) * 200)
        const open = close + (Math.cos(i * 1.1) * 150)
        const high = Math.max(open, close) + Math.abs(Math.sin(i) * 180)
        const low = Math.min(open, close) - Math.abs(Math.cos(i) * 200)
        return {
          date: `Day ${i + 1}`,
          open: Math.round(open),
          high: Math.round(high),
          low: Math.round(low),
          close: Math.round(close),
          volume: Math.round(4500000 + Math.abs(Math.sin(i) * 2500000))
        }
      }),
      events: [
        { day: 3, title: 'DeepSeek-V3 저비용 고성능 발표', description: '미국 빅테크 대비 100분의 1 비용으로 학습 가능한 모델이 깜짝 발표되며 인프라 독점 의문이 제기됩니다.', importance: 'high' },
        { day: 8, title: '엔비디아 사상 최대 하루 17% 폭락', description: '하드웨어 수요 둔화 루머와 고평가 논란에 칩 대장주 엔비디아가 무너지며 나스닥 기술주들이 도미노 폭락합니다.', importance: 'high' },
        { day: 11, title: '빅테크 연합 "AI 수요 건재" 공동 성명', description: '마이크로소프트, 구글 등이 가이던스 유지를 공언하며 낙폭 과대 기술주 중심의 강력한 저가 매수세가 유입됩니다.', importance: 'medium' },
        { day: 15, title: '미국 AI 칩 수출 제한 추가 검토', description: '지정학적 리스크와 규제 리스크가 재부각되며 반등하던 지수가 재차 매물을 맞고 출렁입니다.', importance: 'medium' },
        { day: 18, title: '실적 시즌 반도체 호실적 랠리', description: '우려와 달리 차세대 AI 칩 실적이 최고치를 경신하며 시장은 냉정을 되찾고 추세적 안정을 도모합니다.', importance: 'medium' }
      ]
    }
  ])

  // 2. 로그인 유저의 시나리오 도전 내역 리스트 가져오기
  const fetchUserAttempts = async () => {
    if (!user.value) return []
    const { data, error } = await supabase
      .from('scenario_attempts')
      .select('scenario_id, score, correct_count, completed_at')
      .eq('user_id', user.value.id)

    if (error) {
      console.error('[useScenario] fetchUserAttempts error:', error.message)
      return []
    }
    return data || []
  }

  // 3. 특정 시나리오의 랭킹 리스트 가져오기
  const fetchScenarioRankings = async (scenarioId: number) => {
    try {
      const data = await $fetch('/api/scenarios/rankings', {
        query: { scenarioId }
      })
      return data as any[]
    } catch (err) {
      console.error('[useScenario] fetchScenarioRankings error:', err)
      return []
    }
  }

  // 4. 게임 최종 완료 기록 저장하기
  const submitScenarioAttempt = async (scenarioId: number, correctCount: number, totalDays: number) => {
    try {
      const data = await $fetch('/api/scenarios/attempt', {
        method: 'POST',
        body: { scenarioId, correctCount, totalDays }
      })
      return { success: true, data }
    } catch (err: any) {
      console.error('[useScenario] submitScenarioAttempt error:', err)
      return { success: false, message: err.statusMessage || '기록 저장 중 오류가 발생했습니다.' }
    }
  }

  return {
    scenarios,
    fetchUserAttempts,
    fetchScenarioRankings,
    submitScenarioAttempt
  }
}
