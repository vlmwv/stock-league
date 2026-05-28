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
  type: '역사' | '가상'
  indexName: 'S&P 500' | 'KOSPI' | 'NASDAQ'
  etfName: 'SPY' | 'KODEX 200' | 'QQQ' | 'SOXX'
  startDate: string
  endDate: string
  description: string
  candles: CandleData[]
  events: ScenarioEvent[]
}

export const useScenario = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const session = useSupabaseSession()

  const scenarios = ref<Scenario[]>([
    {
      id: 1,
      title: '2008 글로벌 금융위기',
      subtitle: 'SPY | 2008-09-01 ~ 2008-10-15',
      difficulty: '어려움',
      type: '역사',
      indexName: 'S&P 500',
      etfName: 'SPY',
      startDate: '2008-09-01',
      endDate: '2008-10-15',
      description: '리먼 브러더스 파산으로 시작된 역사적 금융 대폭락 시나리오. 공포의 소용돌이에서 SPY ETF의 상승과 하락을 맞히고 살아남을 수 있을까요?',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 140
        let prevClose = basePrice
        for (let i = 0; i < 144; i++) {
          let offset = 0
          if (i < 40) {
            offset = -0.3 * i
          } else if (i < 80) {
            offset = -12 - 0.7 * (i - 40)
          } else if (i < 110) {
            offset = -40 - 1.5 * (i - 80)
          } else {
            offset = -85 + 0.8 * (i - 110)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.5) * 4))
          const open = i === 0 ? Math.round(close + (Math.cos(i) * 2)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 1.5))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 1.8))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(1500000 + Math.abs(Math.sin(i) * 1200000))
          })
        }
        return list
      })(),
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
      subtitle: 'KODEX 200 | 2020-03-02 ~ 2020-04-10',
      difficulty: '보통',
      type: '역사',
      indexName: 'KOSPI',
      etfName: 'KODEX 200',
      startDate: '2020-03-02',
      endDate: '2020-04-10',
      description: '바이러스 공포가 전 세계 금융시장을 잠식하며 KODEX 200 ETF가 한 달 만에 -35% 폭락 후 극적인 V자 반등을 거둔 기적의 매수 기회 시나리오입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 30000
        let prevClose = basePrice
        for (let i = 0; i < 102; i++) {
          let offset = 0
          if (i < 40) {
            offset = -250 * i
          } else {
            offset = -10000 + 170 * (i - 40)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.4) * 630))
          const open = i === 0 ? Math.round(close - (i < 40 ? -170 : 110) + (Math.cos(i) * 350)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 420))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 490))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(2500000 + Math.abs(Math.cos(i) * 1800000))
          })
        }
        return list
      })(),
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
      subtitle: 'QQQ | 2026-01-15 ~ 2026-02-25',
      difficulty: '어려움',
      type: '가상',
      indexName: 'NASDAQ',
      etfName: 'QQQ',
      startDate: '2026-01-15',
      endDate: '2026-02-25',
      description: '중국 AI 모델 DeepSeek의 파괴적 가성비 발표로 엔비디아가 급락하고 빅테크의 AI 인프라 고평가 거품론이 터졌던 초긴장 상태의 QQQ ETF 시뮬레이션입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 450
        let prevClose = basePrice
        for (let i = 0; i < 20; i++) {
          let offset = 0
          if (i < 8) {
            offset = -7 * i
          } else if (i < 15) {
            offset = -56 + 5 * (i - 8)
          } else {
            offset = -21 + 0.8 * (i - 15)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 1.2) * 5))
          const open = i === 0 ? Math.round(close + (Math.cos(i * 1.1) * 4)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 4.5))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 5))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(4500000 + Math.abs(Math.sin(i) * 2500000))
          })
        }
        return list
      })(),
      events: [
        { day: 3, title: 'DeepSeek-V3 저비용 고성능 발표', description: '미국 빅테크 대비 100분의 1 비용으로 학습 가능한 모델이 깜짝 발표되며 인프라 독점 의문이 제기됩니다.', importance: 'high' },
        { day: 8, title: '엔비디아 사상 최대 하루 17% 폭락', description: '하드웨어 수요 둔화 루머와 고평가 논란에 칩 대장주 엔비디아가 무너지며 나스닥 기술주들이 도미노 폭락합니다.', importance: 'high' },
        { day: 11, title: '빅테크 연합 "AI 수요 건재" 공동 성명', description: '마이크로소프트, 구글 등이 가이던스 유지를 공언하며 낙폭 과대 기술주 중심의 강력한 저가 매수세가 유입됩니다.', importance: 'medium' },
        { day: 15, title: '미국 AI 칩 수출 제한 추가 검토', description: '지정학적 리스크와 규제 리스크가 재부각되며 반등하던 지수가 재차 매물을 맞고 출렁입니다.', importance: 'medium' },
        { day: 18, title: '실적 시즌 반도체 호실적 랠리', description: '우려와 달리 차세대 AI 칩 실적이 최고치를 경신하며 시장은 냉정을 되찾고 추세적 안정을 도모합니다.', importance: 'medium' }
      ]
    },
    {
      id: 4,
      title: '1997 IMF 외환위기',
      subtitle: 'KODEX 200 | 1997-10-01 ~ 1998-02-28',
      difficulty: '어려움',
      type: '역사',
      indexName: 'KOSPI',
      etfName: 'KODEX 200',
      startDate: '1997-10-01',
      endDate: '1998-02-28',
      description: '대기업 연쇄 부도와 외환보유고 고갈로 한보철강, 기아차 등이 무너지고 IMF 구제금융을 신청하게 되는 국가 부도의 날 시나리오입니다. (KODEX 200 가상 매칭)',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 9000
        let prevClose = basePrice
        for (let i = 0; i < 120; i++) {
          let offset = 0
          if (i < 65) {
            offset = -64 * i
          } else if (i < 88) {
            offset = -4200 - 42 * (i - 65)
          } else if (i < 110) {
            offset = -5180 + (Math.sin((i - 88) * 0.5) * 280)
          } else {
            offset = -5180 + 210 * (i - 110)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.6) * 210))
          const open = i === 0 ? Math.round(close + (Math.cos(i) * 140)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 112))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 140))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(1200000 + Math.abs(Math.sin(i) * 900000))
          })
        }
        return list
      })(),
      events: [
        { day: 15, title: '한보철강 및 기아자동차 부도 도미노', description: '대기업들의 연쇄 부실 대출이 드러나며 금융권 전체의 신용 경색이 시작되고 외국인 자금이 빠르게 이탈합니다.', importance: 'medium' },
        { day: 42, title: '대한민국 국가 신용등급 강등', description: '세계 3대 신용평가사들이 한국의 신용등급을 투자 부적격 수준으로 연쇄 강등하고, 환율이 폭등합니다.', importance: 'high' },
        { day: 65, title: 'IMF 구제금융 공식 신청', description: '정부가 외환보유고 고갈을 공식 인정하고 국제통화기금(IMF)에 긴급 자금 지원을 요청하며 증시가 대폭락합니다.', importance: 'high' },
        { day: 88, title: '초고금리 구조조정 조건 합의', description: 'IMF가 고금리 유지와 혹독한 구조조정을 강제하며, 대규모 정리해고 우려로 증시가 2차 폭락합니다.', importance: 'high' },
        { day: 110, title: '국민 금 모으기 운동 및 외환 안정화', description: '온 국민이 참여한 금 모으기 운동이 전 세계에 보도되고 외환보유고가 회복되며 기적적인 반등이 시작됩니다.', importance: 'medium' }
      ]
    },
    {
      id: 5,
      title: '2000 닷컴 버블 붕괴',
      subtitle: 'QQQ | 2000-03-01 ~ 2000-10-15',
      difficulty: '어려움',
      type: '역사',
      indexName: 'NASDAQ',
      etfName: 'QQQ',
      startDate: '2000-03-01',
      endDate: '2000-10-15',
      description: '실적 없이 기대감만으로 폭등했던 인터넷 벤처 기업들의 거품이 한순간에 꺼지며 QQQ ETF가 무참히 폭락했던 역사적인 닷컴 붕괴 시나리오입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 120
        let prevClose = basePrice
        for (let i = 0; i < 140; i++) {
          let offset = 0
          if (i < 35) {
            offset = -0.42 * i
          } else if (i < 92) {
            offset = -15 - 0.6 * (i - 35)
          } else if (i < 125) {
            offset = -49 - 0.75 * (i - 92)
          } else {
            offset = -74 + 0.25 * (i - 125)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.4) * 2.5))
          const open = i === 0 ? Math.round(close + (Math.cos(i * 0.9) * 2)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 1.5))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 1.75))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(3000000 + Math.abs(Math.cos(i) * 2000000))
          })
        }
        return list
      })(),
      events: [
        { day: 10, title: '닷컴 기업 수익성 의문론 제기', description: '매출 없이 광고비만 지출하는 닷컴 기업들의 실태가 고발되며 맹목적 투기 열풍에 찬물이 끼얹어집니다.', importance: 'medium' },
        { day: 35, title: '마이크로소프트 반독점법 위반 판결', description: '미 법원의 독과점 판결로 규제 공포가 확산되며 대형 기술주 투매와 나스닥 패닉 셀링이 시작됩니다.', importance: 'high' },
        { day: 60, title: '펫츠닷컴 등 대표 벤처 파산 돌입', description: '수백억 밸류의 상장 벤처들이 수개월 만에 도미노 파산 신청을 하며 본격적인 거품 붕괴 국면에 진입합니다.', importance: 'high' },
        { day: 92, title: '연방준비제도 급격한 금리 인상', description: '연준이 과열된 버블을 잡기 위해 연이어 기준금리를 인상하면서 고평가 기술주들이 무참히 붕괴됩니다.', importance: 'high' },
        { day: 125, title: '우량 빅테크 실적 하향 랠리', description: '시스코, 인텔 등 실체가 굳건하던 우량 IT 대장주들마저 실적 전망치를 대폭 깎으며 닷컴 붕괴가 완결됩니다.', importance: 'medium' }
      ]
    },
    {
      id: 6,
      title: '2025 러-우 전쟁 전격 종식 및 재건',
      subtitle: 'SPY | 2025-06-01 ~ 2025-10-15',
      difficulty: '보통',
      type: '역사',
      indexName: 'S&P 500',
      etfName: 'SPY',
      startDate: '2025-06-01',
      endDate: '2025-10-15',
      description: '수년간 원자재 인플레이션을 자극하던 러-우 전쟁이 평화 협정으로 극적 휴전되면서 시작되는 글로벌 인프라 대재건 호재 시나리오입니다. (SPY ETF)',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 490
        let prevClose = basePrice
        for (let i = 0; i < 100; i++) {
          let offset = 0
          if (i < 12) {
            offset = Math.sin(i * 1.5) * 4
          } else if (i < 35) {
            offset = 0.87 * (i - 12)
          } else if (i < 62) {
            offset = 20 + 1.5 * (i - 35)
          } else if (i < 85) {
            offset = 60.5 + 0.6 * (i - 62)
          } else {
            offset = 74.3 + 1.0 * (i - 85)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.8) * 3.5))
          const open = i === 0 ? Math.round(close - 1.5 + (Math.cos(i) * 2)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 1.5))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 1.8))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(2000000 + Math.abs(Math.sin(i) * 1200000))
          })
        }
        return list
      })(),
      events: [
        { day: 12, title: '비밀 평화회담 개최 합의 외신 보도', description: '양측 대표단이 전격 합의에 접근했다는 특종 보도가 흘러나오며 지정학적 리스크가 해소되기 시작합니다.', importance: 'medium' },
        { day: 35, title: '공식 5개국 평화휴전 협정 조인', description: '마침내 전격적인 휴전 선언이 공식 보도되며 전쟁 종식 선언과 함께 증시가 강력한 상승 축포를 쏩니다.', importance: 'high' },
        { day: 62, title: '흑해 곡물 항로 및 원자재 공급망 전면 개방', description: '천연가스 및 농산물 유통망이 전면 해방되자 국제 인플레이션 지표가 전쟁 이전 수준으로 급락해 안정을 찾습니다.', importance: 'medium' },
        { day: 85, title: '1조 달러 규모 재건 마셜플랜 합의', description: '서방과 세계은행이 전후 재건 펀드 조성을 최종 확정하며 건설, 기계, 인프라 섹터가 기록적인 불기둥을 뽑아냅니다.', importance: 'high' }
      ]
    },
    {
      id: 7,
      title: '2026 이란-중동 전쟁 발발',
      subtitle: 'QQQ | 2026-09-01 ~ 2026-12-10',
      difficulty: '어려움',
      type: '역사',
      indexName: 'NASDAQ',
      etfName: 'QQQ',
      startDate: '2026-09-01',
      endDate: '2026-12-10',
      description: '호르무즈 해협 봉쇄와 중동발 전면 확전으로 유가가 폭등하고 3차 오일쇼크 우려가 테크 증시를 덮치는 블랙 스완 QQQ ETF 가상 시나리오입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 440
        let prevClose = basePrice
        for (let i = 0; i < 90; i++) {
          let offset = 0
          if (i < 8) {
            offset = Math.cos(i) * 2.5
          } else if (i < 25) {
            offset = -1.75 * (i - 8)
          } else if (i < 48) {
            offset = -29.75 - 2.275 * (i - 25)
          } else if (i < 72) {
            offset = -82.075 + (Math.sin(i * 0.7) * 6.25)
          } else {
            offset = -82.075 + 1.625 * (i - 72)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.9) * 3))
          const open = i === 0 ? Math.round(close + (Math.cos(i * 1.2) * 2.5)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 2))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 2.25))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(4000000 + Math.abs(Math.sin(i) * 2800000))
          })
        }
        return list
      })(),
      events: [
        { day: 8, title: '호르무즈 해협 유조선 격침 봉쇄', description: '물류 요충지인 해협 통행이 일시 차단되며 공급망 훼손 공포에 유가가 하루 8% 폭등 랠리를 시작합니다.', importance: 'medium' },
        { day: 25, title: '중동 다국적군 대규모 공습 및 미군 참전', description: '이스라엘-이란 전면 충돌과 강대국 무력 개입이 선포되며, 안전자산 선호 심리가 가파르게 쏠립니다.', importance: 'high' },
        { day: 48, title: '국제 유가 배럴당 $150 고점 돌파', description: '오일 쇼크 및 스태그플레이션 공포가 엄습하며 물가를 잡기 위한 기준금리 인상 루머에 증시가 대폭락합니다.', importance: 'high' },
        { day: 72, title: '서방 비축유 사상 최대 추가 긴급 방출', description: '서방 동맹국들의 대규모 전략비축유 시장 긴급 방출 정책이 합의되며 에너지 수급 불안이 진정세로 돕니다.', importance: 'medium' },
        { day: 90, title: 'UN 휴전 결의안 수락 조율 소식', description: '극적인 중재 협상이 타결 국면에 접어들면서 폭등했던 유가와 원자재 시장이 마침내 안정을 되찾습니다.', importance: 'medium' }
      ]
    },
    {
      id: 8,
      title: '2028 메타버스 디바이스 혁명',
      subtitle: 'QQQ | 2028-03-01 ~ 2028-06-20',
      difficulty: '보통',
      type: '가상',
      indexName: 'NASDAQ',
      etfName: 'QQQ',
      startDate: '2028-03-01',
      endDate: '2028-06-20',
      description: '경량 스마트 글래스가 스마트폰을 전면 대체하며 글로벌 가상현실 생태계와 부품 시장이 폭발적으로 급성장하는 QQQ ETF 가상 미래 시나리오입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 460
        let prevClose = basePrice
        for (let i = 0; i < 110; i++) {
          let offset = 0
          if (i < 15) {
            offset = Math.sin(i * 0.5) * 2
          } else if (i < 40) {
            offset = 1.3 * (i - 15)
          } else if (i < 65) {
            offset = 32.5 + 1.7 * (i - 40)
          } else if (i < 90) {
            offset = 75 - 2.9 * (i - 65)
          } else {
            offset = 2.5 + 5.0 * (i - 90)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.6) * 3.75))
          const open = i === 0 ? Math.round(close - 0.75 + (Math.cos(i) * 3)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 2.5))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 2.75))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(3500000 + Math.abs(Math.cos(i) * 2200000))
          })
        }
        return list
      })(),
      events: [
        { day: 15, title: '경량 스마트 글래스 전격 통합 공개', description: '폰 없이 일상 대화와 업무를 홀로그램으로 소화하는 초소형 렌즈 안경이 대히트 치며 테크주 랠리가 시작됩니다.', importance: 'medium' },
        { day: 40, title: '메타버스 원격 근무 출퇴근 법제화', description: '선진국 주요 오피스 기업들이 가상현실 출퇴근을 도입하며 메타버스 생태계 주식들이 폭발적으로 급등합니다.', importance: 'high' },
        { day: 65, title: '초정밀 가상 스크린 부품 품귀 사태', description: '글래스 생산량 증폭으로 핵심 마이크로OLED 패널 공급이 수요를 못 따라가며 부품 장비주들이 상승 불기둥을 뿝니다.', importance: 'high' },
        { day: 90, title: '가상현실 몰입 과다 청소년 유해성 논란', description: '기기 장기 밀착 사용으로 인한 신경 유해성이 보도되며, 규제 강화를 피하기 위한 일시 조정 매물이 쏟아집니다.', importance: 'medium' },
        { day: 110, title: '햅틱 물리 촉감 슈트 통합 패키지 출시', description: '현실의 물리적 마찰과 촉감을 99% 재현하는 가죽 슈트 양산 소식에 메타버스 생태계가 마침내 완전체로 우뚝 섭니다.', importance: 'medium' }
      ]
    },
    {
      id: 9,
      title: '2030 AGI 싱귤래리티와 노동의 종말',
      subtitle: 'SOXX | 2030-01-10 ~ 2030-05-20',
      difficulty: '어려움',
      type: '가상',
      indexName: 'NASDAQ',
      etfName: 'SOXX',
      startDate: '2030-01-10',
      endDate: '2030-05-20',
      description: '인간의 지능을 완전히 아득히 뛰어넘은 초지능 인공지능(AGI)의 등장으로 초래된 생산성 대폭발과 대규모 실업난 속 SOXX 반도체 ETF 기반의 초변동성 미래 시나리오입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 550
        let prevClose = basePrice
        for (let i = 0; i < 130; i++) {
          let offset = 0
          if (i < 12) {
            offset = 1.5 * i
          } else if (i < 45) {
            offset = 18 + 2.5 * (i - 12)
          } else if (i < 75) {
            offset = 100.5 - 6.25 * (i - 45)
          } else if (i < 100) {
            offset = -87 + (Math.sin(i * 1.1) * 15)
          } else {
            offset = -87 + 4.5 * (i - 100)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 1.5) * 7.5))
          const open = i === 0 ? Math.round(close + (Math.cos(i * 1.3) * 6.25)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 5.5))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 6))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(6000000 + Math.abs(Math.sin(i) * 4500000))
          })
        }
        return list
      })(),
      events: [
        { day: 12, title: 'OpenAI 초지능 모델 Omega 전격 공개', description: '스스로 학습하고 소프트웨어를 재설계하는 완전한 AGI 모델 Omega 발표에 전 세계 테크 빅테크가 폭증합니다.', importance: 'high' },
        { day: 45, title: '주요 50개 대기업 화이트칼라 감원 시작', description: 'AGI 기반 업무 자동화로 하루아침에 대규모 구조조정이 현실화되자 소비 위축 우려로 증시가 공포의 폭락을 개시합니다.', importance: 'high' },
        { day: 75, title: '기본소득제 법안 검토 및 초대형 AI세 제안', description: '소비 절벽을 해결하기 위한 정부 차원의 UBI 기본소득 지급 발표 및 기업 과세 이슈로 변동성이 극단적으로 벌어집니다.', importance: 'high' },
        { day: 100, title: '상온 초전도체 3일 만에 AGI로 규명', description: '인간 학계가 못 풀던 신물질 및 희귀 신약 공식을 AGI가 단 사흘 만에 입증 양산하며, 제조업 생산성이 기하급수적으로 폭등합니다.', importance: 'medium' },
        { day: 130, title: 'AI 세금 개혁안 타결 및 공존 안착', description: '기본소득 연동 경제 개혁안이 최종 통과되고 신대공황 패닉이 조기 진화되자 지수가 경이로운 장기 상승세로 접어듭니다.', importance: 'medium' }
      ]
    },
    {
      id: 10,
      title: '2029 슈퍼 엘니뇨와 기후 리스크',
      subtitle: 'KODEX 200 | 2029-07-01 ~ 2029-10-10',
      difficulty: '보통',
      type: '가상',
      indexName: 'KOSPI',
      etfName: 'KODEX 200',
      startDate: '2029-07-01',
      endDate: '2029-10-10',
      description: '초대형 폭염 가뭄으로 글로벌 식량 자재 가격이 폭등하고, 수자원 부족으로 인한 반도체 공장 위기가 찾아오는 KODEX 200 ETF 가상 기후 위기 시나리오입니다.',
      candles: (() => {
        const list: CandleData[] = []
        const basePrice = 36000
        let prevClose = basePrice
        for (let i = 0; i < 100; i++) {
          let offset = 0
          if (i < 10) {
            offset = Math.sin(i) * 280
          } else if (i < 30) {
            offset = -126 * (i - 10)
          } else if (i < 55) {
            offset = -2520 + 33 * (i - 30)
          } else if (i < 80) {
            offset = -1680 - 210 * (i - 55)
          } else {
            offset = -6930 + 245 * (i - 80)
          }
          const close = Math.round(basePrice + offset + (Math.sin(i * 0.8) * 420))
          const open = i === 0 ? Math.round(close + (Math.cos(i) * 350)) : prevClose
          const high = Math.max(open, close) + Math.round(Math.abs(Math.sin(i) * 210))
          const low = Math.min(open, close) - Math.round(Math.abs(Math.cos(i) * 280))
          prevClose = close
          list.push({
            date: `Day ${i + 1}`,
            open,
            high,
            low,
            close,
            volume: Math.round(1800000 + Math.abs(Math.cos(i) * 1000000))
          })
        }
        return list
      })(),
      events: [
        { day: 10, title: '태평양 해수면 엘니뇨 역대 최고 온도 달성', description: '슈퍼 엘니뇨 기후 경보가 공식 발효되며 밀, 커피 등 농산물 원자재 가격이 상한가 폭등 랠리를 펼칩니다.', importance: 'medium' },
        { day: 30, title: '식량 수출국 자국 보호무역 전격 선포', description: '주요 농업 강국들이 기후 대재앙에 대비해 수출 전면 차단을 결단하며, 국내 밥상물가 폭등과 인플레이션 쇼크가 덮칩니다.', importance: 'high' },
        { day: 55, title: '애그리테크 및 미래형 스마트팜 지원 펀드 결성', description: '기후 가뭄 극복을 위한 실내 정밀 농업 스마트팜 부문 대규모 정부 인센티브 공급이 발표되어 관련 테마주가 폭등합니다.', importance: 'high' },
        { day: 80, title: '공업용수 극심한 가뭄으로 반도체 라인 셧다운', description: '공장 쿨링에 필수인 수자원이 메마르자 국내 1위 반도체 생산라인들이 일시 정지에 처하며 대장 IT주가 주저앉습니다.', importance: 'medium' },
        { day: 100, title: '인공강우 대규모 성공 및 글로벌 기후 협약', description: '가뭄 지역의 초대형 인공강우 살포 작업이 극적으로 가동되고 비가 쏟아지자 원자재 시장의 극단적 발작이 가라앉습니다.', importance: 'medium' }
      ]
    }
  ])

  // 2. 로그인 유저의 시나리오 도전 내역 리스트 가져오기
  const fetchUserAttempts = async () => {
    let currentUser = user.value
    if (!currentUser) {
      const { data } = await supabase.auth.getUser()
      currentUser = data?.user
    }
    if (!currentUser?.id) return []

    try {
      const { data, error } = await supabase
        .from('scenario_attempts')
        .select('scenario_id, score, correct_count, total_days, completed_at')
        .eq('user_id', currentUser.id)

      if (error) {
        console.error('[useScenario] fetchUserAttempts DB Error:', error.message)
        return []
      }
      return data || []
    } catch (err) {
      console.error('[useScenario] fetchUserAttempts error:', err)
      return []
    }
  }

  // 3. 특정 시나리오의 랭킹 리스트 가져오기
  const fetchScenarioRankings = async (scenarioId: number) => {
    try {
      // 랭킹은 scenario_attempts와 profiles를 조합해서 랭킹 형태로 직접 서버 API나 클라이언트 쿼리로 가져옴
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
    if (!user.value?.id) {
      return { success: false, message: '로그인이 필요합니다.' }
    }
    const playDays = totalDays > 7 ? totalDays - 7 : totalDays
    const score = Math.round((correctCount / playDays) * 10000) / 100

    try {
      // 중복 도전 검사
      const { data: existing, error: existError } = await supabase
        .from('scenario_attempts')
        .select('id')
        .eq('user_id', user.value.id)
        .eq('scenario_id', scenarioId)
        .maybeSingle()

      if (existError) throw existError
      if (existing) {
        return { success: false, message: '이미 도전이 완료된 시나리오입니다.' }
      }

      // 점수 저장
      const { data, error } = await supabase
        .from('scenario_attempts')
        .insert({
          user_id: user.value.id,
          scenario_id: scenarioId,
          correct_count: correctCount,
          score: score,
          total_days: totalDays
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err: any) {
      console.error('[useScenario] submitScenarioAttempt error:', err)
      return { success: false, message: err.message || '기록 저장 중 오류가 발생했습니다.' }
    }
  }

  return {
    scenarios,
    fetchUserAttempts,
    fetchScenarioRankings,
    submitScenarioAttempt
  }
}
