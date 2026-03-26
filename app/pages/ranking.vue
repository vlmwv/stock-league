<script setup lang="ts">
const { fetchRankings } = useStock()

const displayLimit = ref(20)
const { data: rankings, pending, refresh } = useAsyncData('userRankings', () => fetchRankings(100))

const topThree = computed(() => (rankings.value as any[])?.slice(0, 3) || [])
const others = computed(() => (rankings.value as any[])?.slice(3, displayLimit.value) || [])
const hasMore = computed(() => (rankings.value as any[])?.length > displayLimit.value)

const loadMore = () => {
  displayLimit.value = Math.min(displayLimit.value + 20, 100)
}

const getAvatar = (user: any) => {
  if (user.avatar_url) return user.avatar_url
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`
}
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-8">
        <h2 class="text-3xl font-black text-slate-100 tracking-tight mb-1">실시간 랭킹</h2>
        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">글로벌 예측 리더보드</p>
      </div>

      <div v-if="pending" class="flex justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-primary animate-spin" />
      </div>

      <template v-else-if="(rankings as any[]) && (rankings as any[]).length > 0">
        <!-- Top 3 Highlights -->
        <div class="flex justify-center items-end gap-4 mb-12 mt-16 px-2">
          <!-- 2nd Place -->
          <div v-if="topThree[1]" class="flex-1 flex flex-col items-center group">
            <div class="relative mb-4">
              <div class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all">
                <img :src="getAvatar(topThree[1])" alt="2nd" class="w-full h-full rounded-xl" />
              </div>
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-400 border-4 border-bg-deep flex items-center justify-center font-black text-slate-900 text-xs shadow-lg">2</div>
            </div>
            <p class="text-xs font-bold text-slate-300 mb-1 truncate w-20 text-center">{{ topThree[1].username }}</p>
            <div class="h-20 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
              <span class="text-xs font-black text-slate-400">{{ topThree[1].points.toLocaleString() }}p</span>
            </div>
          </div>

          <!-- 1st Place -->
          <div v-if="topThree[0]" class="flex-1 flex flex-col items-center group -translate-y-4">
            <div class="relative mb-4 scale-125">
               <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div class="relative w-16 h-16 rounded-2xl bg-slate-800 border-2 border-brand-primary p-1">
                <img :src="getAvatar(topThree[0])" alt="1st" class="w-full h-full rounded-xl" />
              </div>
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary border-4 border-bg-deep flex items-center justify-center font-black text-white text-xs shadow-lg">1</div>
            </div>
            <p class="text-xs font-black text-brand-primary mb-1 truncate w-24 text-center">{{ topThree[0].username }}</p>
            <div class="h-28 w-full bg-gradient-to-t from-brand-primary/20 to-brand-primary/5 rounded-t-2xl border-t border-x border-brand-primary/20 flex flex-col items-center justify-center">
              <span class="text-sm font-black text-brand-primary">{{ topThree[0].points.toLocaleString() }}p</span>
            </div>
          </div>

          <!-- 3rd Place -->
          <div v-if="topThree[2]" class="flex-1 flex flex-col items-center group">
            <div class="relative mb-4">
              <div class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all">
                <img :src="getAvatar(topThree[2])" alt="3rd" class="w-full h-full rounded-xl" />
              </div>
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 border-4 border-bg-deep flex items-center justify-center font-black text-white text-xs shadow-lg">3</div>
            </div>
            <p class="text-xs font-bold text-slate-300 mb-1 truncate w-20 text-center">{{ topThree[2].username }}</p>
            <div class="h-16 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
              <span class="text-xs font-black text-slate-400">{{ topThree[2].points.toLocaleString() }}p</span>
            </div>
          </div>
        </div>

        <!-- Leaderboard List Header -->
        <div class="px-4 mb-4 flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          <div class="w-8 text-center">순위</div>
          <div class="flex-1 ml-4">사용자</div>
          <div class="w-16 text-center">참여/성공</div>
          <div class="w-20 text-right">총 포인트</div>
        </div>

        <!-- Leaderboard List -->
        <div class="space-y-2">
          <div v-for="(user, index) in others" :key="user.username" 
               class="glass-dark rounded-2xl p-3 flex items-center hover:bg-slate-800/50 transition-colors border border-white/5 group"
          >
            <!-- Rank -->
            <div class="w-8 flex justify-center">
              <span class="text-xs font-black" :class="index + 4 <= 10 ? 'text-brand-primary' : 'text-slate-500'">{{ index + 4 }}</span>
            </div>

            <!-- Profile & Name -->
            <div class="flex-1 flex items-center gap-3 ml-4">
              <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/50 overflow-hidden shrink-0">
                 <img :src="getAvatar(user)" alt="user" class="w-full h-full object-cover" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-slate-200 truncate">{{ user.username }}</p>
              </div>
            </div>

            <!-- Stats: Participated / Successful -->
            <div class="w-16 text-center">
              <p class="text-[11px] font-black text-slate-400">{{ user.prediction_count }}<span class="text-[9px] font-normal text-slate-600 ml-0.5">회</span></p>
              <p class="text-[10px] font-bold text-rose-500">{{ user.win_count }}<span class="text-[9px] font-normal text-slate-600 ml-0.5">승</span></p>
            </div>

            <!-- Points -->
            <div class="w-20 text-right">
              <p class="text-sm font-black text-slate-100">{{ user.points.toLocaleString() }}<span class="text-[10px] font-bold text-slate-500 ml-0.5">P</span></p>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div v-if="hasMore" class="mt-8 flex justify-center">
          <button @click="loadMore" class="px-6 py-2.5 rounded-2xl bg-slate-800/50 border border-white/5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all">
            더 보기 (100위까지)
          </button>
        </div>
      </template>

      <div v-else class="text-center py-20">
        <p class="text-slate-500 font-bold">랭킹 데이터가 없습니다.</p>
      </div>
    </main>

    <BottomNav />
  </div>
</template>
