<script setup lang="ts">
import { useScenario } from '~/composables/useScenario'
import ScenarioRanking from '~/components/ScenarioRanking.vue'

const route = useRoute()
const router = useRouter()
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
    activeTab.value = 'ranking' // 완료된 유저는 랭킹 탭으로 즉시 강제 이동
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

const getX = (index: number) => {
  const total = visibleCandles.value.length
  const step = chartWidth / Math.max(total, 10)
  return index * step + step / 2
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

// 4. 오늘의 뉴스 및 힌트 텍스트 추출
const todayEvent = computed(() => {
  if (!scenario.value) return null
  return scenario.value.events.find(e => e.day === currentDay.value)
})

// 5. 예측 제출 로직
const handlePredict = async (prediction: 'up' | 'down') => {
  if (isFeedbackMode.value || gameEnded.value || hasAlreadyAttempted.value) return
  
  selectedPredict.value = prediction
  
  const todayCandle = scenario.value?.candles[currentDay.value - 1]
  const tomorrowCandle = scenario.value?.candles[currentDay.value]
  if (!todayCandle || !tomorrowCandle) return
  
  // 실제 등락 확인
  const isUp = tomorrowCandle.close >= todayCandle.close
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
    
    if (currentDay.value < totalDays.value) {
      currentDay.value++
    } else {
      // 최종 거래일 완료 시 최종 기록 Supabase 전송
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

onMounted(async () => {
  if (!scenario.value) {
    router.push('/daily') // 잘못된 접근 시 회귀
    return
  }
  await checkAttemptStatus()
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
      <span class="text-xs font-black text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full border border-white/5">
        {{ scenario?.indexName }} 시뮬레이터
      </span>
    </header>

    <main v-if="scenario" class="max-w-md mx-auto px-6 py-6">
      <!-- Scenario Title -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
            :class="scenario.difficulty === '어려움' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'"
          >
            {{ scenario.difficulty }}
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
          :disabled="gameEnded && hasAlreadyAttempted"
          class="flex-1 pb-3 text-sm font-black transition-all border-b-2"
          :class="[
            activeTab === 'game' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300',
            gameEnded && hasAlreadyAttempted ? 'opacity-30 cursor-not-allowed' : ''
          ]"
        >
          게임 도전
        </button>
        <button 
          @click="activeTab = 'ranking'" 
          class="flex-1 pb-3 text-sm font-black transition-all border-b-2"
          :class="activeTab === 'ranking' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'"
        >
          글로벌 랭킹
        </button>
      </div>

      <!-- TAB 1: GAME BOARD -->
      <div v-if="activeTab === 'game'" class="space-y-6">
        <!-- Dashboard Top Info -->
        <div class="flex justify-between items-center bg-slate-800/40 border border-white/5 rounded-2xl p-4">
          <div>
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">게임 진행도</p>
            <p class="text-sm font-black text-slate-200">Day {{ currentDay }} / {{ totalDays }}</p>
          </div>
          <div class="text-right">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">현재 맞춘 개수</p>
            <p class="text-sm font-black text-emerald-400">{{ correctCount }}승 / {{ predictions.length }}회</p>
          </div>
        </div>

        <!-- 30일 완성 캔들 차트 (SVG 기반 부드러운 반응형) -->
        <div class="glass-dark border border-white/5 rounded-3xl p-5 relative overflow-hidden">
          <!-- Chart Title -->
          <div class="flex justify-between items-start mb-4">
            <span class="text-[10px] font-bold text-slate-500">PRICE HISTORY</span>
            <span class="text-xs font-mono font-black text-brand-primary">
              종가: {{ visibleCandles[visibleCandles.length - 1]?.close.toLocaleString() }}
            </span>
          </div>

          <!-- SVG Canvas -->
          <svg :width="chartWidth" :height="chartHeight + volumeHeight + 20" class="overflow-visible">
            <!-- Grid Lines -->
            <line x1="0" :y1="chartHeight * 0.25" :x2="chartWidth" :y2="chartHeight * 0.25" stroke="rgba(255,255,255,0.03)" />
            <line x1="0" :y1="chartHeight * 0.5" :x2="chartWidth" :y2="chartHeight * 0.5" stroke="rgba(255,255,255,0.03)" />
            <line x1="0" :y1="chartHeight * 0.75" :x2="chartWidth" :y2="chartHeight * 0.75" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3" />

            <!-- Event Vertical lines & Markers -->
            <g v-for="event in scenario.events" :key="event.day">
              <template v-if="event.day <= currentDay">
                <line 
                  :x1="getX(event.day - 1)" 
                  y1="0" 
                  :x2="getX(event.day - 1)" 
                  :y2="chartHeight" 
                  stroke="rgba(56, 189, 248, 0.2)" 
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
                :stroke="candle.close >= candle.open ? '#f87171' : '#60a5fa'" 
                stroke-width="1.5" 
              />
              <!-- Open-Close body -->
              <rect 
                :x="getX(index) - 4" 
                :y="Math.min(getY(candle.open), getY(candle.close))" 
                width="8" 
                :height="Math.max(Math.abs(getY(candle.open) - getY(candle.close)), 1)" 
                :fill="candle.close >= candle.open ? '#f87171' : '#60a5fa'" 
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
                :fill="candle.close >= candle.open ? 'rgba(248,113,113,0.2)' : 'rgba(96,165,250,0.2)'" 
                rx="0.5"
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

        <!-- 예측 입력 영역 -->
        <div v-if="currentDay < totalDays" class="space-y-4">
          <p class="text-center text-xs font-black text-slate-400 tracking-wider">내일 이 주가의 방향은 어떻게 될까요?</p>
          <div class="flex gap-4">
            <button 
              @click="handlePredict('down')"
              :disabled="isFeedbackMode"
              class="flex-1 h-16 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 border border-blue-500/20 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 active:scale-95"
              :class="{ 'opacity-50 grayscale': isFeedbackMode }"
            >
              <UIcon name="i-heroicons-arrow-trending-down" class="w-5 h-5" />
              <span class="text-sm font-black tracking-widest">하락 예측</span>
            </button>
            <button 
              @click="handlePredict('up')"
              :disabled="isFeedbackMode"
              class="flex-1 h-16 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 active:scale-95"
              :class="{ 'opacity-50 grayscale': isFeedbackMode }"
            >
              <UIcon name="i-heroicons-arrow-trending-up" class="w-5 h-5" />
              <span class="text-sm font-black tracking-widest">상승 예측</span>
            </button>
          </div>
        </div>

        <!-- 이미 도전한 사람 진입 차단 및 완료 메시지 -->
        <div v-else class="text-center py-6 glass-dark rounded-3xl border border-white/5 space-y-4">
          <UIcon name="i-heroicons-check-badge" class="w-12 h-12 text-emerald-400" />
          <h3 class="text-lg font-black text-slate-100">{{ totalDays }}일 도전 시뮬레이션 종료!</h3>
          <p class="text-xs text-slate-400 px-8 leading-relaxed">
            축하합니다! 최종 스코어는 <span class="text-emerald-400 font-black">{{ correctCount }}승 ({{ Math.round((correctCount / totalDays) * 100) }}%)</span> 입니다.<br>
            귀하의 점수가 글로벌 랭킹 보드에 안전하게 보관되었습니다.
          </p>
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
