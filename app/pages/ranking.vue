<script setup lang="ts">
const user = useSupabaseUser()
const { fetchRankings, fetchUserStats, totalMemberCount, fetchParticipantCount } = useStock()

const { data: myStats } = useAsyncData('myStats', () => fetchUserStats(), { watch: [user], immediate: !!user.value })

const getKstInfo = () => {
  const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric' } as const
  const parts = new Intl.DateTimeFormat('ko-KR', options).formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')?.value || '2026'
  const month = parts.find(p => p.type === 'month')?.value || '4'
  return { year, month }
}

const kst = getKstInfo()
const selectedYear = ref(kst.year)
const selectedMonth = ref(`${kst.month}월`)
const years = ['전체', kst.year, (parseInt(kst.year) - 1).toString()]
const months = ['전체', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const displayLimit = ref(20)
const sortBy = ref<'win_rate' | 'prediction_count' | 'win_count' | 'rank'>('rank')
const sortOptions = [
  { label: '정답률', value: 'win_rate', icon: 'i-heroicons-chart-bar' },
  { label: '참여수', value: 'prediction_count', icon: 'i-heroicons-hashtag' },
  { label: '정답수', value: 'win_count', icon: 'i-heroicons-check-circle' }
]

const { data: rankings, pending, refresh } = useAsyncData('userRankings', async () => {
  let type = 'all_time'
  let period_key = 'global'

  if (selectedYear.value !== '전체') {
    if (selectedMonth.value === '전체') {
      type = 'yearly'
      period_key = selectedYear.value
    } else {
      type = 'monthly'
      const monthNum = selectedMonth.value.replace('월', '').padStart(2, '0')
      period_key = `${selectedYear.value}-${monthNum}`
    }
  }

  // Use the API directly for filtered rankings
  if (type === 'all_time' && period_key === 'global') {
     return await fetchRankings(100, sortBy.value)
  } else {
    const data = await $fetch('/api/rankings', {
      query: { type, period_key, sort_by: sortBy.value }
    })
    
    return (data as any[]).map((r, index) => ({
      username: r.profiles.username,
      fullName: r.profiles.full_name,
      displayName: r.profiles.display_name_type === 'full_name' ? (r.profiles.full_name || r.profiles.username) : r.profiles.username,
      avatar_url: r.profiles.avatar_url,
      gender: r.profiles.gender,
      points: 0, 
      prediction_count: r.prediction_count,
      win_rate: r.win_rate,
      win_count: r.win_count || Math.round(r.prediction_count * (r.win_rate / 100)),
      rank: index + 1 // Always rank based on current sort
    }))
  }
}, { watch: [selectedYear, selectedMonth, sortBy] })

const topThree = computed(() => (rankings.value as any[])?.slice(0, 3) || [])
const listRankings = computed(() => (rankings.value as any[])?.slice(0, displayLimit.value) || [])
const hasMore = computed(() => (rankings.value as any[])?.length > displayLimit.value)

const loadMore = () => {
  displayLimit.value = Math.min(displayLimit.value + 20, 100)
}

const getAvatar = (user: any) => {
  return user.avatar_url || null
}

const myRankingInfo = computed(() => {
  if (!user.value || !rankings.value) return null
  // 리스트 내에 내가 있는지 확인
  const found = (rankings.value as any[]).find(r => r.username === (user.value?.user_metadata?.full_name || user.value?.email?.split('@')[0]))
  if (found) return found
  
  // 리스트에 없으면 전체 스태츠에서 가져옴 (단, 필터가 '전체'일 때만 의미 있음)
  if (selectedYear.value === '전체' && myStats.value) {
    return {
      username: myStats.value.displayName,
      avatar_url: user.value?.user_metadata?.avatar_url,
      points: myStats.value.points,
      prediction_count: myStats.value.totalGames,
      win_rate: myStats.value.winRate,
      win_count: Math.round(myStats.value.totalGames * (myStats.value.winRate / 100)),
      rank: myStats.value.rank
    }
  }
  return null
})
onMounted(async () => {
  await fetchParticipantCount()
})
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
  
      <!-- My Rank (Sticky/Top) -->
      <div v-if="user && myRankingInfo" class="mb-10 animate-fade-in">
        <p class="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
          나의 현재 순위
        </p>
        <div class="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/10 rounded-3xl p-4 border border-brand-primary/30 flex items-center shadow-lg shadow-brand-primary/5">
          <div class="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0">
            {{ myRankingInfo.rank }}
          </div>
          <div class="flex-1 flex items-center gap-3 ml-4">
            <div class="w-10 h-10 rounded-xl bg-slate-900 border border-brand-primary/30 overflow-hidden shrink-0 flex items-center justify-center">
               <img v-if="myRankingInfo.avatar_url" :src="myRankingInfo.avatar_url" alt="me" class="w-full h-full object-cover" />
               <div v-else class="w-full h-full flex items-center justify-center text-slate-600">
                 <UIcon :name="myRankingInfo.gender === 'female' ? 'i-mdi-gender-female' : myRankingInfo.gender === 'male' ? 'i-mdi-gender-male' : 'i-heroicons-user-20-solid'" class="w-7 h-7" />
               </div>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-black text-slate-100 truncate">{{ myRankingInfo.displayName || myRankingInfo.username }}</p>
              <p class="text-[10px] font-bold text-brand-primary/80 uppercase">상위 {{ Math.max(1, Math.round((myRankingInfo.rank / (totalMemberCount || 100)) * 100)) }}%</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-black text-slate-100">{{ selectedYear === '전체' ? `${myRankingInfo.points.toLocaleString()}P` : `${myRankingInfo.win_rate}%` }}</p>
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{{ myRankingInfo.win_count }}승 / {{ myRankingInfo.prediction_count }}회</p>
          </div>
        </div>
      </div>
  
      <!-- Filters -->
      <div class="flex gap-3 mb-8">
        <div class="flex-1">
          <div class="relative">
            <select v-model="selectedYear" class="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-200 appearance-none focus:outline-none focus:border-brand-primary/50 transition-colors cursor-pointer">
              <option v-for="year in years" :key="year" :value="year">{{ year === '전체' ? '전체 연도' : `${year}년` }}</option>
            </select>
            <UIcon name="i-heroicons-chevron-down-20-solid" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
        <div class="flex-1">
          <div class="relative" :class="{ 'opacity-50 pointer-events-none': selectedYear === '전체' }">
            <select v-model="selectedMonth" class="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-200 appearance-none focus:outline-none focus:border-brand-primary/50 transition-colors cursor-pointer">
              <option v-for="month in months" :key="month" :value="month">{{ month }}</option>
            </select>
            <UIcon name="i-heroicons-chevron-down-20-solid" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      <!-- Sorting Criteria -->
      <div class="flex gap-2.5 mb-8 animate-fade-in" style="animation-delay: 0.1s">
        <button 
          v-for="opt in sortOptions" 
          :key="opt.value"
          @click="sortBy = opt.value as any"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-black transition-all duration-300 border backdrop-blur-sm shadow-sm"
          :class="sortBy === opt.value 
            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-brand-primary/5' 
            : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'"
        >
          <UIcon :name="opt.icon" class="w-3.5 h-3.5" />
          {{ opt.label }}
        </button>
      </div>

      <div v-if="pending" class="flex justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-primary animate-spin" />
      </div>

      <template v-else-if="(rankings as any[]) && (rankings as any[]).length > 0">
        <!-- Top 3 Highlights -->
        <div class="flex justify-center items-end gap-3 mb-8 mt-10 px-2">
          <!-- 2nd Place -->
          <div v-if="topThree[1]" class="flex-1 flex flex-col items-center group">
            <div class="relative mb-3">
              <div class="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all flex items-center justify-center">
                <img v-if="topThree[1].avatar_url" :src="topThree[1].avatar_url" alt="2nd" class="w-full h-full rounded-xl" />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-600">
                  <UIcon :name="topThree[1].gender === 'female' ? 'i-mdi-gender-female' : topThree[1].gender === 'male' ? 'i-mdi-gender-male' : 'i-heroicons-user-20-solid'" class="w-10 h-10" />
                </div>
              </div>
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-400 border-4 border-bg-deep flex items-center justify-center font-black text-slate-900 text-xs shadow-lg">2</div>
            </div>
            <p class="text-xs font-bold text-slate-300 mb-1 truncate w-20 text-center">{{ topThree[1].displayName || topThree[1].username }}</p>
            <div class="h-14 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
              <span class="text-xs font-black" :class="sortBy === 'win_rate' || selectedYear !== '전체' ? 'text-brand-primary' : 'text-slate-400'">
                {{ sortBy === 'win_rate' || (selectedYear !== '전체' && sortBy === 'rank') ? `${topThree[1].win_rate}%` : 
                   sortBy === 'prediction_count' ? `${topThree[1].prediction_count}회` :
                   sortBy === 'win_count' ? `${topThree[1].win_count}승` :
                   `${topThree[1].points.toLocaleString()}p` }}
              </span>
            </div>
          </div>

          <!-- 1st Place -->
          <div v-if="topThree[0]" class="flex-1 flex flex-col items-center group -translate-y-2">
            <div class="relative mb-3 scale-110">
               <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div class="relative w-14 h-14 rounded-2xl bg-slate-800 border-2 border-brand-primary p-1 flex items-center justify-center">
                <img v-if="topThree[0].avatar_url" :src="topThree[0].avatar_url" alt="1st" class="w-full h-full rounded-xl" />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-500">
                  <UIcon :name="topThree[0].gender === 'female' ? 'i-mdi-gender-female' : topThree[0].gender === 'male' ? 'i-mdi-gender-male' : 'i-heroicons-user-20-solid'" class="w-10 h-10" />
                </div>
              </div>
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary border-4 border-bg-deep flex items-center justify-center font-black text-white text-xs shadow-lg">1</div>
            </div>
            <p class="text-xs font-black text-brand-primary mb-1 truncate w-24 text-center">{{ topThree[0].displayName || topThree[0].username }}</p>
            <div class="h-20 w-full bg-gradient-to-t from-brand-primary/20 to-brand-primary/5 rounded-t-2xl border-t border-x border-brand-primary/20 flex flex-col items-center justify-center">
              <span class="text-sm font-black text-brand-primary">
                {{ sortBy === 'win_rate' || (selectedYear !== '전체' && sortBy === 'rank') ? `${topThree[0].win_rate}%` : 
                   sortBy === 'prediction_count' ? `${topThree[0].prediction_count}회` :
                   sortBy === 'win_count' ? `${topThree[0].win_count}승` :
                   `${topThree[0].points.toLocaleString()}p` }}
              </span>
            </div>
          </div>

          <!-- 3rd Place -->
          <div v-if="topThree[2]" class="flex-1 flex flex-col items-center group">
            <div class="relative mb-3">
              <div class="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all flex items-center justify-center">
                <img v-if="topThree[2].avatar_url" :src="topThree[2].avatar_url" alt="3rd" class="w-full h-full rounded-xl" />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-600">
                  <UIcon :name="topThree[2].gender === 'female' ? 'i-mdi-gender-female' : topThree[2].gender === 'male' ? 'i-mdi-gender-male' : 'i-heroicons-user-20-solid'" class="w-10 h-10" />
                </div>
              </div>
              <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 border-4 border-bg-deep flex items-center justify-center font-black text-white text-xs shadow-lg">3</div>
            </div>
            <p class="text-xs font-bold text-slate-300 mb-1 truncate w-20 text-center">{{ topThree[2].displayName || topThree[2].username }}</p>
            <div class="h-12 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
              <span class="text-xs font-black" :class="sortBy === 'win_rate' || selectedYear !== '전체' ? 'text-brand-primary' : 'text-slate-400'">
                {{ sortBy === 'win_rate' || (selectedYear !== '전체' && sortBy === 'rank') ? `${topThree[2].win_rate}%` : 
                   sortBy === 'prediction_count' ? `${topThree[2].prediction_count}회` :
                   sortBy === 'win_count' ? `${topThree[2].win_count}승` :
                   `${topThree[2].points.toLocaleString()}p` }}
              </span>
            </div>
          </div>
        </div>

        <!-- Leaderboard List Header -->
        <div class="px-4 mb-4 flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          <div class="w-8 text-center">순위</div>
          <div class="flex-1 ml-4">사용자</div>
          <div class="w-16 text-center">참여/성공</div>
          <div class="w-20 text-right">
            {{ sortBy === 'win_rate' ? '정답률' : 
               sortBy === 'prediction_count' ? '참여수' :
               sortBy === 'win_count' ? '정답수' :
               selectedYear === '전체' ? '총 포인트' : '정답률' }}
          </div>
        </div>

        <!-- Leaderboard List -->
        <div class="space-y-2">
          <div v-for="(rankingUser, index) in listRankings" :key="rankingUser.username" 
               class="glass-dark rounded-2xl p-3 flex items-center hover:bg-slate-800/50 transition-colors border border-white/5 group"
          >
            <!-- Rank -->
            <div class="w-8 flex justify-center">
              <span class="text-xs font-black" :class="rankingUser.rank <= 10 ? 'text-brand-primary' : 'text-slate-500'">{{ rankingUser.rank }}</span>
            </div>

            <!-- Profile & Name -->
            <div class="flex-1 flex items-center gap-3 ml-4">
              <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/50 overflow-hidden shrink-0 flex items-center justify-center">
                 <img v-if="rankingUser.avatar_url" :src="rankingUser.avatar_url" alt="user" class="w-full h-full object-cover" />
                 <div v-else class="w-full h-full flex items-center justify-center text-slate-700">
                   <UIcon :name="rankingUser.gender === 'female' ? 'i-mdi-gender-female' : rankingUser.gender === 'male' ? 'i-mdi-gender-male' : 'i-heroicons-user-20-solid'" class="w-5 h-5" />
                 </div>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-slate-200 truncate">{{ rankingUser.displayName || rankingUser.username }}</p>
              </div>
            </div>

            <!-- Stats: Participated / Successful -->
            <div class="w-16 text-center">
              <p class="text-[11px] font-black text-slate-400">{{ rankingUser.prediction_count }}<span class="text-[9px] font-normal text-slate-600 ml-0.5">회</span></p>
              <p class="text-[10px] font-bold text-rose-500">{{ rankingUser.win_count }}<span class="text-[9px] font-normal text-slate-600 ml-0.5">승</span></p>
            </div>

            <!-- Score (Dynamic Value based on sort) -->
            <div class="w-20 text-right">
              <p v-if="sortBy === 'win_rate' || (selectedYear !== '전체' && sortBy === 'rank')" class="text-sm font-black text-brand-primary">
                {{ rankingUser.win_rate }}<span class="text-[10px] font-bold text-slate-500 ml-0.5">%</span>
              </p>
              <p v-else-if="sortBy === 'prediction_count'" class="text-sm font-black text-slate-100">
                {{ rankingUser.prediction_count }}<span class="text-[10px] font-bold text-slate-500 ml-0.5">회</span>
              </p>
              <p v-else-if="sortBy === 'win_count'" class="text-sm font-black text-rose-500">
                {{ rankingUser.win_count }}<span class="text-[10px] font-bold text-slate-500 ml-0.5">승</span>
              </p>
              <p v-else class="text-sm font-black text-slate-100">
                {{ rankingUser.points.toLocaleString() }}<span class="text-[10px] font-bold text-slate-500 ml-0.5">P</span>
              </p>
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
