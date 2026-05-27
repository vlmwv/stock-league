<script setup lang="ts">
import { useScenario } from '~/composables/useScenario'

const props = defineProps<{
  scenarioId: number
}>()

const { fetchScenarioRankings } = useScenario()
const currentUser = useSupabaseUser()

const { data: rankings, pending, refresh } = useAsyncData(`scenarioRankings-${props.scenarioId}`, async () => {
  return await fetchScenarioRankings(props.scenarioId)
})

const topThree = computed(() => (rankings.value as any[])?.slice(0, 3) || [])
const listRankings = computed(() => (rankings.value as any[]) || [])

// 실제 예측 참여 횟수: 7일치 초기 데이터는 예측 대상이 아니므로 분모에서 제외
const getPlayDays = (totalDays: number) => totalDays > 7 ? totalDays - 7 : totalDays

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <div class="mt-8 space-y-6">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
        <UIcon name="i-heroicons-trophy" class="w-6 h-6 text-brand-primary" />
        실시간 참여랭킹
      </h3>
      <button 
        @click="refresh" 
        class="w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-brand-primary transition-all active:scale-95"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" :class="{ 'animate-spin': pending }" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-primary animate-spin" />
    </div>

    <template v-else-if="rankings && rankings.length > 0">
      <!-- Top 3 Highlights -->
      <div class="flex justify-center items-end gap-3 mb-10 px-2">
        <!-- 2nd Place -->
        <div v-if="topThree[1]" class="flex-1 flex flex-col items-center group">
          <div class="relative mb-3">
            <div class="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all flex items-center justify-center overflow-hidden">
              <img v-if="topThree[1].profiles?.avatar_url" :src="topThree[1].profiles.avatar_url" alt="2nd" class="w-full h-full rounded-xl object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900 rounded-xl">
                <UIcon :name="topThree[1].profiles?.gender === 'female' ? 'i-mdi-gender-female' : 'i-heroicons-user-20-solid'" class="w-7 h-7" />
              </div>
            </div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 border-2 border-bg-deep flex items-center justify-center text-sm shadow-lg z-10">🥈</div>
          </div>
          <p class="text-xs font-bold text-slate-300 mb-1 truncate w-20 text-center">
            {{ topThree[1].profiles?.username || '참여자' }}
          </p>
          <div class="h-14 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
            <span class="text-xs font-black text-brand-primary">{{ topThree[1].score }}%</span>
            <span class="text-[8px] font-bold text-slate-500">{{ topThree[1].correct_count }} / {{ getPlayDays(topThree[1].total_days || 30) }}</span>
          </div>
        </div>

        <!-- 1st Place -->
        <div v-if="topThree[0]" class="flex-1 flex flex-col items-center group -translate-y-2">
          <div class="relative mb-3 scale-110">
            <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-14 h-14 rounded-2xl bg-slate-800 border-2 border-brand-primary p-1 flex items-center justify-center overflow-hidden">
              <img v-if="topThree[0].profiles?.avatar_url" :src="topThree[0].profiles.avatar_url" alt="1st" class="w-full h-full rounded-xl object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900 rounded-xl">
                <UIcon :name="topThree[0].profiles?.gender === 'female' ? 'i-mdi-gender-female' : 'i-heroicons-user-20-solid'" class="w-7 h-7" />
              </div>
            </div>
            <div class="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 border-2 border-bg-deep flex items-center justify-center text-xl shadow-xl z-10">🥇</div>
          </div>
          <p class="text-xs font-black text-brand-primary mb-1 truncate w-24 text-center">
            {{ topThree[0].profiles?.username || '마스터' }}
          </p>
          <div class="h-18 w-full bg-gradient-to-t from-brand-primary/20 to-brand-primary/5 rounded-t-2xl border-t border-x border-brand-primary/20 flex flex-col items-center justify-center">
            <span class="text-sm font-black text-brand-primary">{{ topThree[0].score }}%</span>
            <span class="text-[9px] font-black text-brand-primary/80">{{ topThree[0].correct_count }} / {{ getPlayDays(topThree[0].total_days || 30) }}</span>
          </div>
        </div>

        <!-- 3rd Place -->
        <div v-if="topThree[2]" class="flex-1 flex flex-col items-center group">
          <div class="relative mb-3">
            <div class="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all flex items-center justify-center overflow-hidden">
              <img v-if="topThree[2].profiles?.avatar_url" :src="topThree[2].profiles.avatar_url" alt="3rd" class="w-full h-full rounded-xl object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900 rounded-xl">
                <UIcon :name="topThree[2].profiles?.gender === 'female' ? 'i-mdi-gender-female' : 'i-heroicons-user-20-solid'" class="w-7 h-7" />
              </div>
            </div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 border-2 border-bg-deep flex items-center justify-center text-sm shadow-lg z-10">🥉</div>
          </div>
          <p class="text-xs font-bold text-slate-300 mb-1 truncate w-20 text-center">
            {{ topThree[2].profiles?.username || '참여자' }}
          </p>
          <div class="h-12 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
            <span class="text-xs font-black text-brand-primary">{{ topThree[2].score }}%</span>
            <span class="text-[8px] font-bold text-slate-500">{{ topThree[2].correct_count }} / {{ getPlayDays(topThree[2].total_days || 30) }}</span>
          </div>
        </div>
      </div>

      <!-- Leaderboard List Header -->
      <div class="px-4 mb-4 flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
        <div class="w-8 text-center">순위</div>
        <div class="flex-1 ml-4">참여자</div>
        <div class="w-20 text-center">정답/참여</div>
        <div class="w-20 text-right">정답률</div>
      </div>

      <!-- Leaderboard List -->
      <div class="space-y-2">
        <!-- 1~3위가 아닌 4위부터 리스트 표시 -->
        <div v-for="(rankingUser, index) in listRankings" :key="index" 
             class="glass-dark rounded-2xl p-3.5 flex items-center border border-white/5 group hover:bg-white/5 transition-all"
        >
          <!-- Rank -->
          <div class="w-8 flex justify-center text-xs font-black text-slate-400">
            {{ index + 1 }}
          </div>

          <!-- Profile Info -->
          <div class="flex-1 flex items-center gap-3 ml-4 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/50 overflow-hidden shrink-0 flex items-center justify-center">
              <img v-if="rankingUser.profiles?.avatar_url" :src="rankingUser.profiles.avatar_url" alt="user" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-700">
                <UIcon :name="rankingUser.profiles?.gender === 'female' ? 'i-mdi-gender-female' : 'i-heroicons-user-20-solid'" class="w-5 h-5" />
              </div>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-200 truncate">{{ rankingUser.profiles?.username || '익명의 개미' }}</p>
              <p class="text-[8px] font-bold text-slate-500 uppercase tracking-tight">{{ formatDate(rankingUser.completed_at) }}</p>
            </div>
          </div>

          <!-- Wins / Attempts -->
          <div class="w-20 text-center shrink-0">
            <p class="text-[10px] font-bold text-slate-400">
              <span class="text-rose-500">{{ rankingUser.correct_count }}</span> / {{ getPlayDays(rankingUser.total_days || 30) }}
            </p>
          </div>

          <!-- Score -->
          <div class="w-20 text-right shrink-0">
            <p class="text-sm font-black text-brand-primary">
              {{ rankingUser.score }}<span class="text-[10px] font-bold text-slate-500 ml-0.5">%</span>
            </p>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-16 glass-dark rounded-3xl border border-white/5">
      <UIcon name="i-heroicons-information-circle" class="w-10 h-10 text-slate-600 mb-2" />
      <p class="text-slate-400 font-bold text-sm">아직 등록된 랭킹 기록이 없습니다.</p>
      <p class="text-slate-600 text-xs mt-1">가장 먼저 시나리오에 완주하고 명예의 전당을 선점하세요!</p>
    </div>
  </div>
</template>
