<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader @open-guide="isGuideOpen = true" />
    <LeagueGuide :is-open="isGuideOpen" @close="isGuideOpen = false" />
 
    <main class="max-w-md mx-auto">
      <!-- Hero Section (Premium Gradient) -->
      <section class="px-6 py-8">
        <div class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-transparent border border-white/10 p-10 shadow-3xl">
          <div class="relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4 animate-pulse-soft">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
              <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">오늘의 리그</span>
            </div>
            <h2 class="text-4xl font-black mb-6 leading-[1.1] tracking-tighter text-slate-100">
              오늘의 차트를 <br/>
              <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">예측해 보세요!</span>
            </h2>
            <div class="flex justify-between items-center mt-8">
                <p class="text-xs text-slate-400 font-medium flex items-center">
                  <span class="text-brand-primary font-bold mr-1">{{ participantCount.toLocaleString() }}명</span> 참여 중
                </p>
              
              <button 
                @click="navigateTo('/daily')"
                class="group relative px-6 py-3 rounded-2xl bg-brand-primary text-slate-900 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all overflow-hidden"
              >
                참여하기
                <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          </div>
          <!-- Decorative UI elements -->
          <div class="absolute -top-10 -right-10 w-48 h-48 bg-brand-primary/20 blur-[60px] rounded-full"></div>
          <div class="absolute top-1/2 -left-10 w-32 h-32 bg-brand-secondary/20 blur-[60px] rounded-full"></div>
        </div>
      </section>
 
      <!-- AI 추천 종목 -->
      <section v-if="recommendedStocks && recommendedStocks.length > 0" class="px-6 mb-10">
        <div class="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-200 tracking-tight">AI 추천 종목</h3>
            <p class="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-0.5">실시간 AI 인사이트</p>
          </div>
        </div>
        
        <div class="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
          <div 
            v-for="stock in recommendedStocks" 
            :key="stock.id"
            class="min-w-[280px] glass-dark rounded-3xl p-5 border border-white/5 relative overflow-hidden group"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="px-1.5 py-0.5 rounded-md bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-tighter">AI 추천</span>
                  <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ stock.code }}</span>
                </div>
                <h4 class="font-bold text-slate-200 text-lg">{{ stock.name }}</h4>
              </div>
              <button 
                @click.stop="toggleHeart(stock.id)"
                class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors hover:bg-white/5"
                :class="isHearted(stock.id) ? 'text-rose-500' : 'text-slate-600'"
              >
                <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
              </button>
            </div>
            <p class="text-xs text-slate-400 line-clamp-2 italic mb-5 leading-relaxed">"{{ stock.summary }}"</p>
            <div class="flex justify-between items-center">
              <div class="flex flex-col">
                <span class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">현재가</span>
                <span class="text-lg font-black text-slate-100">{{ stock.last_price.toLocaleString() }}</span>
              </div>
              <div class="text-right">
                <div 
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-xs"
                  :class="stock.change_amount >= 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'"
                >
                  <UIcon :name="stock.change_amount >= 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" class="w-3.5 h-3.5" />
                  {{ stock.change_rate }}%
                </div>
              </div>
            </div>
            <!-- Decorative gradient -->
            <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-primary/5 blur-3xl rounded-full group-hover:bg-brand-primary/10 transition-colors"></div>
          </div>
        </div>
      </section>
 

      <!-- 최근 뉴스 & 공시 -->
      <section class="px-6 mb-12">
        <div class="flex justify-between items-end mb-6 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-200 tracking-tight">최근 주요 이슈</h3>
            <p class="text-[10px] text-brand-secondary font-bold uppercase tracking-widest mt-0.5">Real-time Feed</p>
          </div>
          <NuxtLink to="/news" class="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline flex items-center gap-1">
            전체보기
            <UIcon name="i-heroicons-chevron-right-20-solid" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>

        <div class="space-y-4">
          <div 
            v-for="item in recentNews" 
            :key="item.id"
            @click="navigateToNews(item)"
            class="glass-dark rounded-3xl p-5 border border-white/5 group hover:bg-white/5 transition-all cursor-pointer"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0 border border-brand-primary/20">
                <UIcon name="i-heroicons-newspaper" class="w-5 h-5 text-brand-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-200 text-sm line-clamp-1 group-hover:text-brand-primary transition-colors">{{ item.title }}</h4>
                <p class="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tighter">{{ item.source }} • {{ formatDate(item.published_at) }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="!recentNews.length" class="text-center py-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p class="text-xs text-slate-600 font-medium">로딩 중이거나 데이터가 없습니다.</p>
          </div>
        </div>
      </section>
    </main>
 

    
    <BottomNav />
 

  </div>
</template>
 
<script setup lang="ts">
const { recommendedStocks, hearts, myPredictions, participantCount, refresh, fetchWishlist, fetchPredictions, toggleHeart, fetchParticipantCount, fetchNews, refreshMarketCap } = useStock()
const isGuideOpen = ref(false)
const recentNews = ref<any[]>([])

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const navigateToNews = (item: any) => {
  if (item && item.url) {
    window.open(item.url, '_blank')
  } else {
    navigateTo('/news')
  }
}

const isHearted = (id: number) => hearts.value.includes(id)

onMounted(async () => {
  await Promise.all([
    refresh(),
    fetchWishlist(),
    fetchPredictions(),
    refreshMarketCap(),
    fetchParticipantCount(),
    (async () => {
      const news = await fetchNews(5)
      recentNews.value = news
    })()
  ])
  
  const hasSeenGuide = localStorage.getItem('hasSeenLeagueGuide')
  if (!hasSeenGuide) {
    isGuideOpen.value = true
    localStorage.setItem('hasSeenLeagueGuide', 'true')
  }
})
</script>
 
<style scoped>
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out;
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
 
.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
 
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
