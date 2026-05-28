<script setup lang="ts">
import { useScenario } from '~/composables/useScenario'
import ScenarioRanking from '~/components/ScenarioRanking.vue'

const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const { scenarios, submitScenarioAttempt, fetchUserAttempts } = useScenario()
const user = useSupabaseUser()

const scenarioId = Number(route.params.id)
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

// 1. 이미 완료한 도전 이력이 있는지 검증
const checkAttemptStatus = async () => {
  if (!user.value) return
  const attempts = await fetchUserAttempts() as any[]
  const found = attempts.find(a => a.scenario_id === scenarioId)
  if (found) {
    hasAlreadyAttempted.value = true
    correctCount.value = found.correct_count
    gameEnded.value = true
    currentDay.value = totalDays.value // 완료 유저는 전체 차트를 한눈에 보도록 최종 일수로 세팅
  }
}

// 2. 현재 화면에 노출될 캔들 데이터 슬라이싱
const visibleCandles = computed(() => {
  if (!scenario.value) return []
  return scenario.value.candles.slice(0, currentDay.value)
})

// 3. 차트 스케일 계산 함수
const chartWidth = 340
const chartHeight = 180
const volumeHeight = 50
const paddingLeft = 12
const paddingRight = 48
const plotWidth = chartWidth - paddingLeft - paddingRight

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

// 4. 호버 및 활성화된 캔들 인덱스 감지 상태 변수
const hoveredIndex = ref<number | null>(null)

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

const activeCandleColorClass = computed(() => {
  const index = activeCandleIndex.value
  const candles = visibleCandles.value
  if (candles.length === 0 || !candles[index]) return 'text-rose-400'
  return candles[index].close >= candles[index].open ? 'text-rose-400' : 'text-blue-400'
})

// 5. 오늘의 뉴스 및 힌트 텍스트 추출
const todayEvent = computed(() => {
  if (!scenario.value) return null
  return scenario.value.events.find(e => e.day === currentDay.value)
})

// 5. 예측 제출 로직
const handlePredict = async (prediction: 'up' | 'down') => {
  if (isFeedbackMode.value || gameEnded.value || hasAlreadyAttempted.value) return
  if (!user.value?.id) {
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

// 6. 점수 DB 제출
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

// 7. 게임 상태 초기화 (재도전)
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

  // user가 이미 로드된 상태면 즉시 도전 이력 확인
  if (user.value?.id) {
    await checkAttemptStatus()
  }
})

// Supabase 세션이 비동기로 로드되는 경우를 대비: user가 로드되면 도전 이력 확인
watch(user, async (newUser) => {
  if (newUser?.id && !hasAlreadyAttempted.value && !gameEnded.value) {
    await checkAttemptStatus()
  }
})
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <!-- Top Header -->
    <header class="max-w-md mx-auto px-6 py-4 flex items-center justify-between border-b border-white/5">
      <button @click="router.back()" class="flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-brand-primary">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        뒤로가기
      </button>
      <div class="flex items-center gap-1.5">
        <span class="text-[9px] font-black text-slate-300 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-md uppercase shrink-0">
          {{ scenario?.indexName }}
        </span>
        <span class="text-[9px] font-black text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-md uppercase shrink-0">
          {{ scenario?.etfName }} 시뮬레이터
        </span>
      </div>
    </header>

    <main v-if="scenario" class="max-w-md mx-auto px-6 py-6">
      <!-- Scenario Title -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <!-- 가상/역사 마크 -->
          <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0"
            :class="scenario.type === '가상' 
              ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' 
              : 'bg-blue-500/20 border-blue-500/30 text-blue-400'"
          >
            {{ scenario.type }}
          </span>
          <!-- 난이도 마크 -->
          <div class="flex items-center gap-1 px-2.5 py-0.5 rounded-md border shrink-0"
            :class="scenario.difficulty === '어려움' 
              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' 
              : scenario.difficulty === '보통' 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'"
          >
            <div class="flex items-center gap-0.5">
              <UIcon 
                v-for="n in 3" 
                :key="n" 
                name="i-heroicons-star-20-solid" 
                class="w-3 h-3"
                :class="n <= (scenario.difficulty === '어려움' ? 3 : scenario.difficulty === '보통' ? 2 : 1) ? '' : 'opacity-20'"
              />
            </div>
            <span class="text-[9px] font-black uppercase tracking-wider ml-0.5">{{ scenario.difficulty }}</span>
          </div>
          <!-- 기초 지수 마크 -->
          <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 bg-slate-800/80 border-slate-700 text-slate-300">
            {{ scenario.indexName }}
          </span>
          <!-- ETF 마크 -->
          <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 bg-brand-primary/20 border-brand-primary/30 text-brand-primary">
            {{ scenario.etfName }}
          </span>
          <span class="text-[10px] font-bold text-slate-500">{{ totalDays }}일 스페셜</span>
        </div>
        <h2 class="text-2xl font-black text-slate-100">{{ scenario.title }}</h2>
        <p class="text-xs text-slate-400 mt-2 leading-relaxed">{{ scenario.description }}</p>
      </section>

      <!-- Tabs Navigation -->
      <div class="flex border-b border-white/5 mb-6">
        <button 
          @click="activeTab = 'game'" 
          class="flex-1 pb-3 text-sm font-black transition-all border-b-2"
          :class="activeTab === 'game' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'"
        >
          게임 도전
        </button>
        <button 
          @click="activeTab = 'ranking'" 
          class="flex-1 pb-3 text-sm font-black transition-all border-b-2"
          :class="activeTab === 'ranking' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'"
        >
          참여랭킹
        </button>
      </div>

      <!-- TAB 1: GAME BOARD -->
      <div v-if="activeTab === 'game'" class="space-y-6">
        <!-- 완성형 캔들 차트 (SVG 기반 부드러운 반응형) -->
        <div class="glass-dark border border-white/5 rounded-3xl p-5 relative overflow-hidden">
          <!-- Chart Title & Interactive OHLCV Dashboard -->
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-bold text-slate-500 tracking-widest">가격 변동 이력</span>
              <span class="text-[10px] font-bold text-slate-400 font-mono">
                {{ activeCandleIndex === visibleCandles.length - 1 ? '실시간 (최종일)' : `${activeCandleIndex + 1}일차` }}
              </span>
            </div>
            
            <!-- OHLCV Board -->
            <div class="grid grid-cols-5 gap-1.5 px-3 py-2 bg-slate-900/60 border border-white/5 rounded-2xl text-[10px] font-mono">
              <div>
                <span class="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">시가</span>
                <span class="text-slate-300 font-bold">{{ formatPrice(activeCandle?.open) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">고가</span>
                <span class="text-rose-400 font-bold">{{ formatPrice(activeCandle?.high) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">저가</span>
                <span class="text-blue-400 font-bold">{{ formatPrice(activeCandle?.low) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">종가</span>
                <span class="font-bold" :class="activeCandleColorClass">{{ formatPrice(activeCandle?.close) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">거래량</span>
                <span class="text-slate-300 font-bold">{{ activeCandle?.volume.toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- SVG Canvas -->
          <svg :width="chartWidth" :height="chartHeight + volumeHeight + 20" class="overflow-visible">
            <!-- Grid Lines & Price Labels (Korean & Guidance) -->
            <line x1="0" :y1="chartHeight * 0.25" :x2="chartWidth" :y2="chartHeight * 0.25" :stroke="isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'" />
            <text :x="chartWidth" :y="chartHeight * 0.25 - 4" text-anchor="end" :fill="isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.55)'" font-size="8" font-weight="900" font-family="Pretendard, sans-serif">{{ formatPrice(priceLabels.y75) }}</text>
            
            <line x1="0" :y1="chartHeight * 0.5" :x2="chartWidth" :y2="chartHeight * 0.5" :stroke="isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'" />
            <text :x="chartWidth" :y="chartHeight * 0.5 - 4" text-anchor="end" :fill="isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.55)'" font-size="8" font-weight="900" font-family="Pretendard, sans-serif">{{ formatPrice(priceLabels.y50) }}</text>
            
            <line x1="0" :y1="chartHeight * 0.75" :x2="chartWidth" :y2="chartHeight * 0.75" :stroke="isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'" stroke-dasharray="3" />
            <text :x="chartWidth" :y="chartHeight * 0.75 - 4" text-anchor="end" :fill="isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.55)'" font-size="8" font-weight="900" font-family="Pretendard, sans-serif">{{ formatPrice(priceLabels.y25) }}</text>

            <!-- Today Active Day Guidance Line -->
            <line 
              v-if="visibleCandles.length > 0"
              :x1="getX(currentDay - 1)" 
              y1="0" 
              :x2="getX(currentDay - 1)" 
              :y2="chartHeight + volumeHeight + 15" 
              :stroke="isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(220, 38, 38, 0.35)'" 
              stroke-dasharray="3" 
              stroke-width="1.5"
            />

            <!-- Event Vertical lines & Markers -->
            <g v-for="event in scenario.events" :key="event.day">
              <template v-if="event.day <= currentDay">
                <line 
                  :x1="getX(event.day - 1)" 
                  y1="0" 
                  :x2="getX(event.day - 1)" 
                  :y2="chartHeight" 
                  :stroke="isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.35)'" 
                  stroke-dasharray="2" 
                />
                <!-- Event marker node -->
                <circle 
                  :cx="getX(event.day - 1)" 
                  :cy="getY(scenario!.candles[event.day - 1]?.high || 0) - 10" 
                  r="5" 
                  fill="#38bdf8" 
                  class="animate-pulse"
                />
              </template>
            </g>

            <!-- Render Candles -->
            <g v-for="(candle, index) in visibleCandles" :key="index">
              <!-- High-Low tail -->
              <line 
                :x1="getX(index)" 
                :y1="getY(candle.high)" 
                :x2="getX(index)" 
                :y2="getY(candle.low)" 
                :stroke="getCandleColor(index)" 
                stroke-width="1.8" 
              />
              <!-- Open-Close body -->
              <rect 
                :x="getX(index) - 4" 
                :y="Math.min(getY(candle.open), getY(candle.close))" 
                width="8" 
                :height="Math.max(Math.abs(getY(candle.open) - getY(candle.close)), 1)" 
                :fill="getCandleColor(index)" 
                :stroke="isDark ? '#0d1527' : '#ffffff'"
                stroke-width="1"
                rx="1"
              />
            </g>

            <!-- Render Volumes (Bottom) -->
            <g v-for="(candle, index) in visibleCandles" :key="'vol-' + index">
              <rect 
                :x="getX(index) - 3" 
                :y="chartHeight + 15 + (volumeHeight - getVolumeY(candle.volume))" 
                width="6" 
                :height="getVolumeY(candle.volume)" 
                :fill="getVolumeColor(index)" 
                rx="0.5"
              />
            </g>

            <!-- Hover detection pillars -->
            <g v-for="(candle, index) in visibleCandles" :key="'hover-' + index">
              <rect 
                :x="getX(index) - (plotWidth / Math.max(visibleCandles.length, 10)) / 2"
                y="0"
                :width="plotWidth / Math.max(visibleCandles.length, 10)"
                :height="chartHeight + volumeHeight + 20"
                fill="transparent"
                class="cursor-pointer hover:fill-white/5 transition-colors duration-150"
                @mouseenter="hoveredIndex = index"
                @mouseleave="hoveredIndex = null"
              />
            </g>
          </svg>

          <!-- Feedback Overlay -->
          <div v-if="isFeedbackMode" 
               class="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-all z-20"
               :class="isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'"
          >
            <div class="px-6 py-3 rounded-2xl border flex items-center gap-2 animate-scale-in shadow-2xl"
                 :class="isCorrect ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/80 border-rose-500/30 text-rose-400'"
            >
              <UIcon :name="isCorrect ? 'i-heroicons-sparkles' : 'i-heroicons-x-circle'" class="w-6 h-6" />
              <span class="text-sm font-black uppercase tracking-wider">{{ isCorrect ? '정답입니다! 🎉' : '오답입니다 😢' }}</span>
            </div>
          </div>
        </div>

        <!-- 속보 / 뉴스 힌트 카드 -->
        <div class="glass-dark border border-white/5 rounded-3xl p-5 min-h-[120px] transition-all"
             :class="todayEvent ? 'border-sky-500/30 bg-sky-500/5' : ''"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[9px] font-black uppercase tracking-widest"
              :class="todayEvent ? 'text-sky-400' : 'text-slate-500'"
            >
              {{ todayEvent ? '🔴 속보 및 이슈 발생' : 'ℹ️ 일일 동향 힌트' }}
            </span>
          </div>
          <template v-if="todayEvent">
            <h4 class="text-sm font-black text-slate-200 mb-1.5">{{ todayEvent.title }}</h4>
            <p class="text-xs text-slate-400 leading-relaxed">{{ todayEvent.description }}</p>
          </template>
          <template v-else>
            <h4 class="text-sm font-black text-slate-300 mb-1.5">특별한 외부 거시 이슈가 감지되지 않았습니다.</h4>
            <p class="text-xs text-slate-500 leading-relaxed">캔들스틱의 꼬리와 거래량 지표의 패턴을 심도 있게 분석하여 다음 날 상승할지 하락할지 결정해 보세요.</p>
          </template>
        </div>

        <!-- Dashboard Top Info -->
        <div class="flex justify-between items-center bg-slate-800/40 border border-white/5 rounded-2xl p-4">
          <div>
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">게임 진행도</p>
            <p class="text-sm font-black text-slate-200">{{ currentDay }}일차 / {{ totalDays }}일</p>
          </div>
          <div class="text-right">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">현재 맞춘 개수</p>
            <p class="text-sm font-black text-emerald-400">{{ correctCount }}승 / {{ hasAlreadyAttempted ? (totalDays > 7 ? totalDays - 7 : totalDays) : predictions.length }}회</p>
          </div>
        </div>

        <!-- 예측 입력 영역 -->
        <div v-if="currentDay < totalDays || hasAlreadyAttempted" class="space-y-4">
          <p class="text-center text-xs font-black text-slate-400 tracking-wider">
            {{ hasAlreadyAttempted ? '이미 참여가 완료된 시나리오입니다.' : '내일 이 주가의 방향은 어떻게 될까요?' }}
          </p>
          <div class="flex gap-4">
            <button 
              @click="handlePredict('down')"
              :disabled="isFeedbackMode || hasAlreadyAttempted"
              class="flex-1 h-16 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 border border-blue-500/20 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 active:scale-95"
              :class="{ 'opacity-50 grayscale cursor-not-allowed': isFeedbackMode || hasAlreadyAttempted }"
            >
              <UIcon name="i-heroicons-arrow-trending-down" class="w-5 h-5" />
              <span class="text-sm font-black tracking-widest">하락 예측</span>
            </button>
            <button 
              @click="handlePredict('up')"
              :disabled="isFeedbackMode || hasAlreadyAttempted"
              class="flex-1 h-16 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 active:scale-95"
              :class="{ 'opacity-50 grayscale cursor-not-allowed': isFeedbackMode || hasAlreadyAttempted }"
            >
              <UIcon name="i-heroicons-arrow-trending-up" class="w-5 h-5" />
              <span class="text-sm font-black tracking-widest">상승 예측</span>
            </button>
          </div>
          <!-- 진행 중 유저에게만 노출되는 처음부터 다시 시작 버튼 -->
          <div v-if="!hasAlreadyAttempted && currentDay > 7" class="text-center pt-2">
            <button 
              @click="confirm('처음부터 다시 도전하시겠습니까?') && resetGame()"
              class="inline-flex items-center gap-1 text-[11px] font-black text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-0 cursor-pointer"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
              처음부터 다시 도전하기
            </button>
          </div>
        </div>

        <!-- 도전 완료 시 안내 카드 (이미 참여했거나 방금 완료한 경우) -->
        <div v-if="hasAlreadyAttempted || (gameEnded && currentDay >= totalDays)" class="text-center py-6 glass-dark rounded-3xl border border-white/5 space-y-4">
          <UIcon name="i-heroicons-check-badge" class="w-12 h-12 text-emerald-400" />
          <h3 class="text-lg font-black text-slate-100">{{ totalDays }}일 도전 시뮬레이션 종료!</h3>
          <p class="text-xs text-slate-400 px-8 leading-relaxed">
            최종 스코어는 <span class="text-emerald-400 font-black">{{ correctCount }}승 ({{ Math.round((correctCount / (totalDays > 7 ? totalDays - 7 : totalDays)) * 100) }}%)</span> 입니다.
          </p>
          
          <div class="px-6 flex flex-col gap-2">
            <button 
              @click="resetGame"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
              처음부터 재도전하기
            </button>
            <p class="text-[10px] text-slate-500">기록 저장에 오류가 발생했거나 점수를 갱신하고 싶다면 재도전해 보세요.</p>
          </div>
        </div>
      </div>

      <!-- TAB 2: GLOBAL LEADERBOARD -->
      <div v-else-if="activeTab === 'ranking'">
        <ScenarioRanking :scenario-id="scenarioId" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scale-in 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
