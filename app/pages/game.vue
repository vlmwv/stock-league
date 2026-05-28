<script setup lang="ts">
import { useScenario } from '~/composables/useScenario'

const { 
  isLeagueOpen, 
  isResultPublished, 
  allPredicted, 
  participantCount, 
  totalMemberCount,
  refreshAll
} = useStock()

const { scenarios, fetchUserAttempts } = useScenario()
const user = useSupabaseUser()
const router = useRouter()

const activeTab = ref<'league' | 'scenarios'>('league')

// 시나리오 관련 상태
const userAttempts = ref<any[]>([])
const pendingScenarios = ref(true)

const loadAttempts = async () => {
  let currentUser = user.value
  if (!currentUser) {
    const supabase = useSupabaseClient()
    const { data } = await supabase.auth.getUser()
    currentUser = data?.user
  }
  if (!currentUser) {
    pendingScenarios.value = false
    return
  }
  pendingScenarios.value = true
  userAttempts.value = await fetchUserAttempts()
  pendingScenarios.value = false
}

// 특정 시나리오의 도전 결과 가져오기
const getAttempt = (scenarioId: number) => {
  return userAttempts.value.find(a => a.scenario_id === scenarioId)
}

const handleParticipation = async () => {
  let currentUser = user.value
  if (!currentUser) {
    const supabase = useSupabaseClient()
    const { data } = await supabase.auth.getUser()
    currentUser = data?.user
  }

  if (isLeagueOpen.value && !currentUser) {
    if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
      router.push('/login')
    }
    return
  }
  router.push('/daily')
}

const handleChallenge = async (scenarioId: number) => {
  let currentUser = user.value
  if (!currentUser) {
    const supabase = useSupabaseClient()
    const { data } = await supabase.auth.getUser()
    currentUser = data?.user
  }

  if (!currentUser) {
    if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
      router.push('/login')
    }
    return
  }
  router.push(`/scenario-game/${scenarioId}`)
}

// Supabase 세션이 비동기로 완료되는 타이밍에 대응하여 유저 도전 이력을 자동으로 로딩
watch(user, async (newUser) => {
  if (newUser?.id) {
    await loadAttempts()
  } else {
    userAttempts.value = []
    pendingScenarios.value = false
  }
}, { immediate: true })

onMounted(async () => {
  await refreshAll()
})
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <!-- Header -->
      <header class="mb-8">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <UIcon name="i-heroicons-puzzle-piece" class="w-4.5 h-4.5 text-brand-primary" />
          <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Game Hub</span>
        </div>
        <h2 class="text-3xl font-black text-slate-100 tracking-tight leading-tight">
          플레이 <span class="text-brand-primary">라운지</span>
        </h2>
        <p class="text-xs text-slate-500 mt-2 leading-relaxed">
          오늘의 예측 리그에 참가하여 실시간 순위를 다투고, 역사적/가상 경제 시나리오 속에서 생존하여 명예의 전당을 획득해 보세요.
        </p>
      </header>

      <!-- Tabs Navigation -->
      <div class="flex border-b border-white/5 mb-8">
        <button 
          @click="activeTab = 'league'" 
          class="flex-1 pb-3 text-sm font-black transition-all border-b-2"
          :class="activeTab === 'league' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'"
        >
          오늘의 리그 🏆
        </button>
        <button 
          @click="activeTab = 'scenarios'" 
          class="flex-1 pb-3 text-sm font-black transition-all border-b-2"
          :class="activeTab === 'scenarios' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-300'"
        >
          시나리오 서바이벌 📈
        </button>
      </div>

      <!-- TAB 1: 오늘의 리그 -->
      <div v-if="activeTab === 'league'" class="space-y-8 animate-fade-in">
        <!-- 오늘의 예측 리그 카드 -->
        <div 
          @click="handleParticipation"
          class="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] cursor-pointer"
        >
          <!-- Subtle Glow -->
          <div class="absolute -top-12 -right-12 w-28 h-28 bg-brand-primary/10 blur-2xl rounded-full group-hover:bg-brand-primary/20 transition-all"></div>
          
          <div class="relative z-10 flex flex-col gap-4">
            <div class="flex items-start justify-between">
              <div>
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-primary/20 text-[9px] font-black text-brand-primary uppercase tracking-widest mb-2.5">
                  Daily League
                </div>
                <h3 class="text-xl font-black text-slate-100 group-hover:text-brand-primary transition-colors leading-tight">
                  오늘의 차트 예측 리그 📊
                </h3>
              </div>
              <div class="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0 group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-slate-900 transition-all">
                <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
              </div>
            </div>
            
            <p class="text-xs text-slate-400 leading-relaxed font-medium">
              오늘의 엄선된 5개 종목의 종가 상승/하락을 실시간 차트를 보고 예측하세요. 예측이 적중할수록 랭킹 스코어가 급상승합니다!
            </p>

            <!-- Participation Info -->
            <div class="p-4 rounded-2xl bg-slate-800/30 border border-white/5 flex flex-col gap-2.5">
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span class="font-bold">리그 참여자 수</span>
                <span class="font-bold text-slate-200">
                  오늘 {{ participantCount.toLocaleString() }}명 <span class="text-slate-500 font-normal">(누적 {{ totalMemberCount.toLocaleString() }}명)</span>
                </span>
              </div>
              <div class="h-px bg-white/5"></div>
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span class="font-bold">진행 상태</span>
                <span class="font-black" :class="isLeagueOpen ? 'text-brand-primary' : 'text-slate-500'">
                  {{ allPredicted ? '예측 완료 ✓' : (isLeagueOpen ? '참여 대기 중' : '리그 종료 (결과 대기)') }}
                </span>
              </div>
            </div>

            <button 
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all bg-brand-primary text-slate-900 border-brand-primary hover:scale-[1.02] shadow-lg shadow-brand-primary/10"
            >
              <UIcon name="i-heroicons-play-20-solid" class="w-4 h-4" />
              {{ allPredicted ? '내 예측 현황 보기' : '예측 리그 도전하기' }}
            </button>
          </div>
        </div>

        <!-- 오늘의 예측 리그 랭킹 보드 결합 -->
        <div class="border-t border-white/5 pt-4">
          <div class="mb-4">
            <h3 class="text-lg font-black text-slate-100 flex items-center gap-2">
              <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-brand-primary" />
              예측 리그 랭킹
            </h3>
            <p class="text-[10px] text-slate-500 mt-1">예측 성공을 통해 쌓인 포인트를 기준으로 매겨지는 글로벌 실시간 유저 순위표입니다.</p>
          </div>
          <RankingUser />
        </div>
      </div>

      <!-- TAB 2: 시나리오 서바이벌 -->
      <div v-else-if="activeTab === 'scenarios'" class="space-y-6 animate-fade-in">
        <!-- Loading State -->
        <div v-if="pendingScenarios" class="space-y-6">
          <div v-for="i in 3" :key="i" class="glass-dark rounded-3xl p-6 border border-white/5 animate-pulse">
            <div class="h-4 w-24 bg-white/5 rounded mb-3"></div>
            <div class="h-6 w-48 bg-white/5 rounded mb-4"></div>
            <div class="h-16 w-full bg-white/5 rounded-2xl mb-4"></div>
            <div class="h-12 w-full bg-white/5 rounded-2xl"></div>
          </div>
        </div>

        <!-- Scenarios Grid -->
        <div v-else class="space-y-6">
          <div 
            v-for="item in scenarios" 
            :key="item.id"
            class="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]"
            :class="getAttempt(item.id) ? 'border-emerald-500/20 bg-slate-900/60 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.1)]' : ''"
          >
            <!-- Badge Header -->
            <div class="flex items-center justify-between mb-4 gap-2">
              <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
                <!-- 가상/역사 마크 -->
                <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0"
                  :class="item.type === '가상' 
                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' 
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-400'"
                >
                  {{ item.type }}
                </span>
                <!-- 난이도 마크 -->
                <div class="flex items-center gap-1 px-2.5 py-0.5 rounded-md border shrink-0"
                  :class="item.difficulty === '어려움' 
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' 
                    : item.difficulty === '보통' 
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                      : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'"
                >
                  <div class="flex items-center gap-0.5">
                    <UIcon 
                      v-for="n in 3" 
                      :key="n" 
                      name="i-heroicons-star-20-solid" 
                      class="w-3 h-3"
                      :class="n <= (item.difficulty === '어려움' ? 3 : item.difficulty === '보통' ? 2 : 1) ? '' : 'opacity-20'"
                    />
                  </div>
                  <span class="text-[9px] font-black uppercase tracking-wider ml-0.5">{{ item.difficulty }}</span>
                </div>
                <!-- 기초 지수 마크 -->
                <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 bg-slate-800/80 border-slate-700 text-slate-300">
                  {{ item.indexName }}
                </span>
                <!-- ETF 마크 -->
                <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 bg-brand-primary/20 border-brand-primary/30 text-brand-primary">
                  {{ item.etfName }}
                </span>
              </div>
              
              <!-- 도전 완료 여부 배지 (정답 수 / 총 문제 수 표시 추가) -->
              <div v-if="getAttempt(item.id)" class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 shrink-0">
                <UIcon name="i-heroicons-check-circle-20-solid" class="w-3.5 h-3.5" />
                도전완료 ({{ getAttempt(item.id).score }}% | {{ getAttempt(item.id).correct_count }} / {{ getAttempt(item.id).total_days || item.candles.length }})
              </div>
            </div>

            <!-- Title -->
            <h3 class="text-xl font-black text-slate-100 group-hover:text-brand-primary transition-colors mb-1">
              {{ item.title }}
            </h3>
            <p class="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-4">
              {{ item.startDate }} ~ {{ item.endDate }} | {{ item.candles.length }}일 거래 시뮬레이션
            </p>

            <!-- Description -->
            <p class="text-xs text-slate-400 leading-relaxed mb-6">
              {{ item.description }}
            </p>

            <!-- Button -->
            <button 
              @click="handleChallenge(item.id)"
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 border"
              :class="[
                getAttempt(item.id) 
                  ? 'bg-slate-800/50 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                  : 'bg-brand-primary text-slate-900 border-brand-primary hover:scale-[1.02] shadow-lg shadow-brand-primary/10'
              ]"
            >
              <UIcon 
                :name="getAttempt(item.id) ? 'i-heroicons-trophy-20-solid' : 'i-heroicons-play-20-solid'" 
                class="w-4 h-4" 
              />
              {{ getAttempt(item.id) ? '참여랭킹 조회' : '시나리오 도전하기' }}
            </button>
          </div>
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
