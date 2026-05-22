<script setup lang="ts">
const { 
  isLeagueOpen, 
  isResultPublished, 
  allPredicted, 
  participantCount, 
  totalMemberCount,
  refreshAll
} = useStock()

const user = useSupabaseUser()
const router = useRouter()

const handleParticipation = () => {
  if (isLeagueOpen.value && !user.value) {
    if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
      router.push('/login')
    }
    return
  }
  router.push('/daily')
}

const handleScenarios = () => {
  router.push('/scenarios')
}

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
          예측 리그에서 매일 상승/하락을 맞추고, 다양한 역사적/가상 경제 시나리오 속에서 생존하여 순위를 다투어보세요.
        </p>
      </header>

      <!-- Game Cards Grid -->
      <div class="space-y-6">
        <!-- 1. 오늘의 예측 리그 카드 -->
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

        <!-- 2. 역사/가상 시나리오 예측 게임 카드 -->
        <div 
          @click="handleScenarios"
          class="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-brand-secondary/30 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] cursor-pointer"
        >
          <!-- Subtle Glow -->
          <div class="absolute -top-12 -right-12 w-28 h-28 bg-brand-secondary/10 blur-2xl rounded-full group-hover:bg-brand-secondary/20 transition-all"></div>
          
          <div class="relative z-10 flex flex-col gap-4">
            <div class="flex items-start justify-between">
              <div>
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-secondary/20 text-[9px] font-black text-brand-secondary uppercase tracking-widest mb-2.5">
                  Survival Simulation
                </div>
                <h3 class="text-xl font-black text-slate-100 group-hover:text-brand-secondary transition-colors leading-tight">
                  역사 & 가상 시나리오 예측 서바이벌 📈
                </h3>
              </div>
              <div class="w-10 h-10 rounded-2xl bg-brand-secondary/10 border border-brand-secondary/20 flex items-center justify-center text-brand-secondary shrink-0 group-hover:scale-110 group-hover:bg-brand-secondary group-hover:text-slate-900 transition-all">
                <UIcon name="i-heroicons-sparkles" class="w-5 h-5" />
              </div>
            </div>
            
            <p class="text-xs text-slate-400 leading-relaxed font-medium">
              역사적 금융위기(IMF, 리먼 쇼크)부터 가상의 미래 AI 대변혁까지! 격변하는 시장 시나리오의 흐름 속에서 끝까지 자산을 지켜내고 생존하세요.
            </p>

            <div class="p-4 rounded-2xl bg-slate-800/30 border border-white/5 text-xs text-slate-400 leading-normal">
              📌 각 시나리오는 단 <span class="text-brand-secondary font-black">한 번의 도전 기회</span>만 제공되며, 최종 스코어는 글로벌 명예의 전당 랭킹에 기록됩니다.
            </div>

            <button 
              class="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all bg-brand-secondary text-slate-900 border-brand-secondary hover:scale-[1.02] shadow-lg shadow-brand-secondary/10"
            >
              <UIcon name="i-heroicons-play-20-solid" class="w-4 h-4" />
              시뮬레이션 선택하기
            </button>
          </div>
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
</style>
