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
              <div class="flex gap-3">
                <div class="flex -space-x-2">
                  <div v-for="i in 3" :key="i" class="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                     <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`" alt="avatar" class="w-full h-full object-cover" />
                  </div>
                </div>
                <p class="text-xs text-slate-400 font-medium flex items-center">
                  <span class="text-brand-primary font-bold mr-1">{{ (participantCount + 1240).toLocaleString() }}명</span> 참여 중
                </p>
              </div>
              
              <button 
                @click="scrollToGame"
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
 
      <!-- 오늘의 도전 뷰 -->
      <section id="daily-stocks-view" class="px-6 relative h-[500px]">
        <!-- 게임 시작 스테이트 -->
        <div v-if="!isGameStarted && currentIndex < dailyStocks.length" class="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fade-in">
          <div class="relative group">
            <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div class="relative w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 shadow-3xl">
              <UIcon name="i-heroicons-play-20-solid" class="w-12 h-12 text-brand-primary" />
            </div>
          </div>
          <div class="space-y-4">
            <h3 class="text-3xl font-black text-slate-100 italic tracking-tighter">
              오늘의 예측 리그 <br/>
              <span class="text-brand-primary">준비되셨나요?</span>
            </h3>
            <p class="text-sm text-slate-400 font-medium max-w-[200px] mx-auto leading-relaxed">
              총 {{ dailyStocks.length }}개의 종목을 예측하고 <br/>
              포인트를 획득하세요!
            </p>
          </div>
          <button 
            @click="isGameStarted = true"
            :disabled="!isLeagueOpen"
            class="group relative px-12 py-4 rounded-2xl bg-brand-primary text-slate-900 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all overflow-hidden"
            :class="!isLeagueOpen ? 'opacity-50 grayscale cursor-not-allowed' : ''"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            {{ isLeagueOpen ? '지금 시작하기' : '오늘 레그 마감' }}
          </button>
        </div>
 
        <!-- 활성 게임 스테이트 -->
        <div v-else-if="currentIndex < dailyStocks.length" class="relative w-full h-full">
          <StockCard 
            v-for="(stock, index) in dailyStocks.slice(currentIndex, currentIndex + 3)" 
            :key="stock.id"
            :stock="stock"
            :is-hearted="isHearted(stock.id)"
            :prediction="getPrediction(stock.id)"
            :is-top="index === 0"
            :index="index"
            :is-league-open="isLeagueOpen"
            class="absolute inset-0 transition-all duration-500"
            :style="{
              transform: `translateY(${index * 20}px) scale(${1 - index * 0.05})`,
              opacity: 1 - index * 0.2,
              filter: `blur(${index * 2}px)`
            }"
            @predict="onPredict"
            @toggle-heart="toggleHeart"
            @cancel-prediction="cancelPrediction"
          />
        </div>
 
        <!-- 완료 스테이트 -->
        <div v-else class="flex flex-col items-center justify-center h-full text-center space-y-6 animate-scale-in">
          <div class="w-20 h-20 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-2xl">
            <UIcon name="i-heroicons-check-circle-20-solid" class="w-10 h-10 text-brand-primary" />
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-black text-slate-100 italic">오늘의 예측 완료!</h3>
            <p class="text-sm text-slate-400 font-medium">내일 20:20에 결과를 확인하세요.</p>
          </div>
          <NuxtLink 
            to="/ranking"
            class="px-8 py-3 rounded-2xl bg-slate-800 text-slate-200 font-black text-xs uppercase tracking-widest border border-white/5 hover:bg-slate-700 transition-all"
          >
            랭킹 확인하기
          </NuxtLink>
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
            @click="navigateToNews"
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
 
    <!-- 다이얼로그 & 내비게이션 -->
    <PredictionResultDialog 
      :is-open="isResultOpen"
      :stock-name="selectedStockName"
      :prediction="selectedPrediction"
      @close="isResultOpen = false"
    />
    
    <BottomNav />
 
    <!-- 힌트 토스트 -->
    <div v-if="showHint && isLeagueOpen" class="fixed bottom-24 inset-x-0 flex justify-center z-40 animate-fade-in-up">
       <div class="glass flex items-center gap-2 px-4 py-2 rounded-2xl shadow-2xl">
          <UIcon name="i-heroicons-hand-raised-20-solid" class="w-4 h-4 text-brand-primary" />
          <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">위를 향하면 상승, 아래면 하락</p>
       </div>
    </div>
  </div>
</template>
 
<script setup lang="ts">
const { dailyStocks, recommendedStocks, hearts, myPredictions, participantCount, refresh, fetchWishlist, fetchPredictions, toggleHeart, predict, fetchParticipantCount, isLeagueOpen, fetchNews, refreshMarketCap } = useStock()
const isResultOpen = ref(false)
const selectedStockName = ref('')
const selectedPrediction = ref<'up' | 'down' | null>(null)
const showHint = ref(false)
const isGuideOpen = ref(false)
const currentIndex = ref(0)
const isGameStarted = ref(false)
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

const navigateToNews = () => {
  navigateTo('/news')
}
 
const scrollToGame = () => {
  isGameStarted.value = true
  
  nextTick(() => {
    const element = document.getElementById('daily-stocks-view')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}
 
const isHearted = (id: number) => hearts.value.includes(id)
const getPrediction = (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null
 
const onPredict = (id: number, prediction: 'up' | 'down') => {
  const stock = [...dailyStocks.value].find(s => s.id === id)
  if (stock) {
    predict(id, prediction)
    selectedStockName.value = stock.name
    selectedPrediction.value = prediction
    isResultOpen.value = true
    showHint.value = false
    
    setTimeout(() => {
      currentIndex.value++
    }, 600)
  }
}
 
const cancelPrediction = (id: number) => {
  const index = myPredictions.value.findIndex(p => p.stockId === id)
  if (index > -1) {
    myPredictions.value.splice(index, 1)
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }
}
 
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
  
  if (myPredictions.value && myPredictions.value.length > 0) {
    let count = 0
    for (const stock of dailyStocks.value) {
      if (myPredictions.value.some(p => p.stockId === stock.id)) {
        count++
      } else {
        break
      }
    }
    currentIndex.value = count
  }
 
  const hasSeenGuide = localStorage.getItem('hasSeenLeagueGuide')
  if (!hasSeenGuide) {
    isGuideOpen.value = true
    localStorage.setItem('hasSeenLeagueGuide', 'true')
  }
 
  setTimeout(() => { showHint.value = true }, 2000)
  setTimeout(() => { showHint.value = false }, 7000)
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
