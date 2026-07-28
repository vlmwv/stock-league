// useScenarioGame: 시나리오 예측 미니게임(scenario-game/[id].vue)의 상태와 진행 로직.
// 캔들 슬라이싱·예측 판정·점수 제출·재도전·도전 이력 확인과 진입 라이프사이클을 담당한다.
// SVG 차트 좌표 계산은 useScenarioChart가 별도로 담당한다.
export const useScenarioGame = (scenarioId: number) => {
  const router = useRouter()
  const { scenarios, submitScenarioAttempt, fetchUserAttempts } = useScenario()
  const { user, resolveUser } = useStockClient()

  const scenario = computed(() => scenarios.value.find(s => s.id === scenarioId))
  const totalDays = computed(() => scenario.value?.candles.length || 30)

  // 게임 핵심 상태 변수
  const currentDay = ref(7) // 초기 7일치의 캔들을 보여주고 예측을 유도
  const correctCount = ref(0)
  const predictions = ref<('up' | 'down')[]>([])
  const gameEnded = ref(false)
  const selectedPredict = ref<'up' | 'down' | null>(null)
  const isFeedbackMode = ref(false)
  const isCorrect = ref(false)
  const isSubmitting = ref(false)
  const hasAlreadyAttempted = ref(false)
  const activeTab = ref<'game' | 'ranking'>('game')

  // 현재 화면에 노출될 캔들 데이터 슬라이싱
  const visibleCandles = computed(() => {
    if (!scenario.value) return []
    return scenario.value.candles.slice(0, currentDay.value)
  })

  // 오늘의 뉴스 및 힌트 텍스트 추출
  const todayEvent = computed(() => {
    if (!scenario.value) return null
    return scenario.value.events.find(e => e.day === currentDay.value)
  })

  // 이미 완료한 도전 이력이 있는지 검증
  const checkAttemptStatus = async () => {
    const currentUser = await resolveUser()
    if (!currentUser) return

    const attempts = await fetchUserAttempts() as any[]
    const found = attempts.find(a => a.scenario_id === scenarioId)
    if (found) {
      hasAlreadyAttempted.value = true
      correctCount.value = found.correct_count
      gameEnded.value = true
      currentDay.value = totalDays.value // 완료 유저는 전체 차트를 한눈에 보도록 최종 일수로 세팅
    }
  }

  // 예측 제출 로직
  const handlePredict = async (prediction: 'up' | 'down') => {
    if (isFeedbackMode.value || gameEnded.value || hasAlreadyAttempted.value) return

    const currentUser = await resolveUser()

    if (!currentUser?.id) {
      if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
        router.push('/login')
      }
      return
    }

    selectedPredict.value = prediction

    const todayCandle = scenario.value?.candles[currentDay.value - 1]
    const tomorrowCandle = scenario.value?.candles[currentDay.value]
    if (!todayCandle || !tomorrowCandle) return

    // 실제 등락 확인 (당일 시가 대비 종가 기준으로 정답 판정 일치)
    const isUp = tomorrowCandle.close >= tomorrowCandle.open
    const actual = isUp ? 'up' : 'down'

    isCorrect.value = prediction === actual
    if (isCorrect.value) {
      correctCount.value++
    }

    predictions.value.push(prediction)
    isFeedbackMode.value = true

    // 1.5초 후 피드백 모드 해제 및 다음 날로 갱신
    setTimeout(async () => {
      isFeedbackMode.value = false
      selectedPredict.value = null

      if (currentDay.value < totalDays.value - 1) {
        currentDay.value++
      } else {
        // 최종 거래일 완료 시 최종 기록 Supabase 전송
        currentDay.value++
        gameEnded.value = true
        await submitScore()
        activeTab.value = 'ranking'
      }
    }, 1600)
  }

  // 점수 DB 제출
  const submitScore = async () => {
    if (isSubmitting.value) return
    isSubmitting.value = true
    const res = await submitScenarioAttempt(scenarioId, correctCount.value, totalDays.value)
    isSubmitting.value = false
    if (res.success) {
      hasAlreadyAttempted.value = true
    } else {
      alert(res.message)
    }
  }

  // 게임 상태 초기화 (재도전)
  const resetGame = () => {
    currentDay.value = 7
    correctCount.value = 0
    predictions.value = []
    gameEnded.value = false
    selectedPredict.value = null
    isFeedbackMode.value = false
    isCorrect.value = false
    isSubmitting.value = false
    activeTab.value = 'game'
  }

  // 확인 후 처음부터 다시 시작 (템플릿에서 전역 confirm 직접 호출 시 타입 미해결되므로 핸들러로 분리)
  const confirmReset = () => {
    if (window.confirm('처음부터 다시 도전하시겠습니까?')) resetGame()
  }

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return ''
    if (scenario.value?.etfName === 'KODEX 200') {
      return `${price.toLocaleString()}원`
    }
    return `$${price.toLocaleString()}`
  }

  onMounted(async () => {
    if (!scenario.value) {
      router.push('/daily') // 잘못된 접근 시 회귀
      return
    }

    // 이전 게임 상태의 찌꺼기를 방지하기 위해 진입 시 기본 리셋을 먼저 수행
    resetGame()

    // user가 이미 로드된 상태면 즉시 도전 이력 확인 (비동기 지연 복구 크로스체크 포함)
    const currentUser = await resolveUser()
    if (currentUser?.id) {
      await checkAttemptStatus()
    }
  })

  // Supabase 세션이 비동기로 로드되는 경우를 대비: user가 로드되면 도전 이력 확인
  watch(user, async (newUser) => {
    if (newUser?.id && !hasAlreadyAttempted.value && !gameEnded.value) {
      await checkAttemptStatus()
    }
  })

  return {
    scenario,
    totalDays,
    visibleCandles,
    currentDay,
    correctCount,
    predictions,
    gameEnded,
    selectedPredict,
    isFeedbackMode,
    isCorrect,
    isSubmitting,
    hasAlreadyAttempted,
    activeTab,
    todayEvent,
    handlePredict,
    resetGame,
    confirmReset,
    formatPrice
  }
}
