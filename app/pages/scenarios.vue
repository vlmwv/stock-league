<script setup lang="ts">
import { useScenario } from '~/composables/useScenario'

const router = useRouter()
const { scenarios, fetchUserAttempts } = useScenario()
const user = useSupabaseUser()

const userAttempts = ref<any[]>([])
const pending = ref(true)

const loadAttempts = async () => {
  if (!user.value) return
  pending.value = true
  userAttempts.value = await fetchUserAttempts()
  pending.value = false
}

// 특정 시나리오의 도전 결과 가져오기
const getAttempt = (scenarioId: number) => {
  return userAttempts.value.find(a => a.scenario_id === scenarioId)
}

const handleChallenge = (scenarioId: number) => {
  router.push(`/scenario-game/${scenarioId}`)
}

onMounted(async () => {
  await loadAttempts()
})
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <header class="mb-8">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Scenario Simulation</span>
        </div>
        <h2 class="text-3xl font-black text-slate-100 tracking-tight leading-tight">
          시나리오 <span class="text-brand-primary">선택</span>
        </h2>
        <p class="text-xs text-slate-500 mt-2 leading-relaxed">
          역사적 사건 혹은 가상 시나리오의 변동성 속에서 살아남으세요. 각 시나리오는 단 한 번만 도전할 수 있으며 결과는 명예의 전당에 기록됩니다.
        </p>
      </header>

      <!-- Loading State -->
      <section v-if="pending" class="space-y-6">
        <div v-for="i in 3" :key="i" class="glass-dark rounded-3xl p-6 border border-white/5 animate-pulse">
          <div class="h-4 w-24 bg-white/5 rounded mb-3"></div>
          <div class="h-6 w-48 bg-white/5 rounded mb-4"></div>
          <div class="h-16 w-full bg-white/5 rounded-2xl mb-4"></div>
          <div class="h-12 w-full bg-white/5 rounded-2xl"></div>
        </div>
      </section>

      <!-- Scenarios Grid -->
      <section v-else class="space-y-6">
        <div 
          v-for="item in scenarios" 
          :key="item.id"
          class="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]"
          :class="getAttempt(item.id) ? 'border-emerald-500/20 bg-slate-900/60 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.1)]' : ''"
        >
          <!-- Badge Header -->
          <div class="flex items-center justify-between mb-4">
            <span class="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
              :class="item.difficulty === '어려움' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'"
            >
              {{ item.difficulty }}
            </span>
            
            <!-- 도전 완료 여부 배지 -->
            <div v-if="getAttempt(item.id)" class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400">
              <UIcon name="i-heroicons-check-circle-20-solid" class="w-3.5 h-3.5" />
              도전완료 ({{ getAttempt(item.id).score }}%)
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-xl font-black text-slate-100 group-hover:text-brand-primary transition-colors mb-1">
            {{ item.title }}
          </h3>
          <p class="text-[10px] font-mono text-slate-500 uppercase tracking-tighter mb-4">
            {{ item.subtitle }} | {{ item.candles.length }}일
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
      </section>
    </main>

    <BottomNav />
  </div>
</template>
