<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-clip">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <!-- User Profile Card -->
      <section class="mb-10">
        <div class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 via-slate-800/40 to-slate-900/40 border border-white/10 p-8 pt-12 shadow-3xl text-center">
          <div class="relative z-10">
            <div class="relative inline-block mb-6">
              <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-[2rem] blur opacity-30"></div>
              <div class="relative w-24 h-24 rounded-[2rem] bg-slate-800 border-2 border-slate-700 p-1 shadow-2xl overflow-hidden flex items-center justify-center">
                <img v-if="stats?.avatarUrl" :src="stats.avatarUrl" alt="Profile" class="w-full h-full rounded-[1.5rem]" />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-500">
                  <UIcon :name="stats?.gender === 'female' ? 'i-heroicons-user-circle-20-solid' : 'i-heroicons-user-20-solid'" class="w-16 h-16" />
                </div>
              </div>
              <div @click="openEditModal" class="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-primary border-4 border-slate-900 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                 <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-white" />
              </div>
            </div>
            
            <h2 class="text-2xl font-black text-slate-100 tracking-tight mb-1">{{ stats?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] }}님</h2>
            <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">마스터 예측 티어</p>
            
            <div class="grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
              <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">순위</p>
                <p class="text-lg font-black text-brand-primary">#{{ stats?.rank || '-' }}</p>
              </div>
              <div class="border-x border-white/5">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">포인트</p>
                <p class="text-lg font-black text-slate-200">{{ stats?.points?.toLocaleString() || 0 }}</p>
              </div>
              <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">승률</p>
                <p class="text-lg font-black text-emerald-400">{{ stats?.winRate || 0 }}%</p>
              </div>
            </div>
          </div>

          <!-- Decorative blobs -->
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 blur-[60px] rounded-full"></div>
          <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-secondary/10 blur-[60px] rounded-full"></div>
        </div>
      </section>

      <section class="grid grid-cols-2 gap-4 mb-10">
        <div class="glass-dark rounded-3xl p-6 border border-white/5">
           <UIcon name="i-heroicons-fire" class="w-6 h-6 text-orange-500 mb-3" />
           <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">연속 참여</p>
           <p class="text-xl font-black text-slate-200">{{ stats?.streak || 0 }}일</p>
        </div>
        <div class="glass-dark rounded-3xl p-6 border border-white/5">
           <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-sky-500 mb-3" />
           <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">총 게임 수</p>
           <p class="text-xl font-black text-slate-200">{{ stats?.totalGames || 0 }}회</p>
        </div>
      </section>
      

      <!-- Prediction History Header -->
      <div class="px-2 mb-6 flex justify-between items-center">
        <h3 class="text-xl font-black text-slate-200 tracking-tight">최근 예측 기록</h3>
        <NuxtLink to="/history" class="w-8 h-8 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all active:scale-95">
          <UIcon name="i-heroicons-plus-20-solid" class="w-5 h-5" />
        </NuxtLink>
      </div>

      <!-- History List -->
      <div class="space-y-4">
        <div v-if="loading" class="text-center py-10 text-slate-500 font-bold">로딩 중...</div>
        <div v-else-if="history.length === 0" class="text-center py-10 text-slate-500 font-bold">예측 기록이 없습니다.</div>
        <NuxtLink 
          v-for="item in history" 
          :key="item.id" 
          :to="item.stockCode ? '/stocks/' + item.stockCode : undefined"
          class="glass-dark rounded-3xl p-5 border border-white/5 flex items-center gap-4 group hover:bg-white/5 transition-colors cursor-pointer"
        >
           <!-- Icon/Initial -->
           <div class="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xs font-black border border-white/5 shrink-0 text-slate-400">
              {{ item.stockName.substring(0, 1) }}
           </div>

           <!-- Stock Info -->
           <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-200 truncate text-sm">{{ item.stockName }}</h4>
                <span v-if="item.stockCode" class="text-[9px] font-bold text-slate-600 uppercase shrink-0">{{ item.stockCode }}</span>

              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] font-bold text-slate-500 whitespace-nowrap">{{ item.game_date }}</span>
                <span class="w-1 h-1 rounded-full bg-slate-800"></span>
                <span 
                  class="text-[10px] font-black"
                  :class="item.prediction_type === 'up' ? 'text-rose-400' : 'text-indigo-400'"
                >
                  {{ item.prediction_type === 'up' ? '상승' : '하락' }} 예측
                </span>
              </div>
           </div>

           <!-- Status & Points -->
           <div class="flex flex-col items-end gap-2 shrink-0">
              <span 
                class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                :class="{
                  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': item.result === 'win',
                  'bg-rose-500/10 text-rose-500 border-rose-500/20': item.result === 'lose',
                  'bg-slate-500/10 text-slate-500 border-slate-500/20': item.result === 'pending' || item.result === 'draw'
                }"
              >
                {{ 
                  item.result === 'win' ? '성공' : 
                  item.result === 'lose' ? '실패' : 
                  item.result === 'draw' ? '무승부' : '대기중'
                }}
              </span>
              <p v-if="item.result !== 'pending' && item.points_awarded !== 0" class="text-[10px] font-black text-slate-500 tracking-tighter">
                {{ item.points_awarded > 0 ? '+' : '' }}{{ item.points_awarded }}p
              </p>
           </div>
        </NuxtLink>
      </div>

      <!-- AI 추천 이력 바로가기 (마이페이지 하단) -->
      <div class="mt-8 px-2">
          <NuxtLink 
            to="/daily-history" 
            class="w-full py-4 rounded-3xl bg-slate-800/30 border border-white/5 flex items-center justify-center gap-3 group hover:bg-white/5 transition-all"
          >
            <div class="p-2 rounded-xl bg-orange-400/10 border border-orange-400/20 group-hover:bg-orange-400/20 transition-all">
              <UIcon name="i-heroicons-sparkles-20-solid" class="w-4 h-4 text-orange-400" />
            </div>
            <div class="text-left">
              <p class="text-xs font-black text-slate-200">AI 추천 이력 확인하기</p>
              <p class="text-[10px] font-bold text-slate-500">AI의 과거 예측 성과를 한눈에 보세요</p>
            </div>
            <UIcon name="i-heroicons-chevron-right-20-solid" class="ml-auto mr-4 w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </NuxtLink>
      </div>
    </main>

    <BottomNav />

    <!-- Edit Profile Modal -->
    <UserProfileModal 
      v-model:open="isEditModalOpen" 
      :current-username="stats?.username || user?.user_metadata?.full_name"
      :current-gender="stats?.gender"
      @success="onProfileUpdate"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { hearts, fetchUserStats, fetchUserHistory, fetchWishlist } = useStock()
const user = useSupabaseUser()

const stats = ref<any>(null)
const history = ref<any[]>([])
const loading = ref(true)
const isEditModalOpen = ref(false)

const openEditModal = () => {
  isEditModalOpen.value = true
}

const onProfileUpdate = async () => {
  stats.value = await fetchUserStats()
}

onMounted(async () => {
  const [statsData, historyData] = await Promise.all([
    fetchUserStats(),
    fetchUserHistory(1, 10)
  ])
  stats.value = statsData
  history.value = historyData
  loading.value = false
})
</script>
