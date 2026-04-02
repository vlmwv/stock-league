<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader @open-guide="isGuideOpen = true" />
    <LeagueGuide :is-open="isGuideOpen" @close="isGuideOpen = false" />
 
    <main class="max-w-md mx-auto">
      <!-- Hero Section (Premium Gradient) -->
      <section class="px-4 py-4">
        <div class="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-transparent border border-white/10 p-6 shadow-3xl">
          <div class="relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4 animate-pulse-soft">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
              <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">오늘의 리그</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black mb-4 leading-tight tracking-tighter text-slate-100">
              오늘의 차트를 <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">예측해 보세요!</span>
            </h2>
            <div class="flex flex-col gap-2 mt-4">
              <div class="flex items-center gap-2">
                <div class="flex -space-x-2">
                  <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-slate-900 overflow-hidden shadow-lg">
                    <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123 + 456}`" alt="user" class="w-full h-full object-cover bg-slate-800" />
                  </div>
                  <div class="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-lg">+</div>
                </div>
                <p class="text-xs text-slate-400 font-bold tracking-tight">
                  <span class="text-slate-100">{{ totalMemberCount.toLocaleString() }}명</span>의 투자자가 참여 중
                </p>
              </div>
              
              <div v-if="participantCount > 0" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 w-fit">
                <span class="flex h-2 w-2 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                </span>
                <p class="text-[10px] text-brand-primary font-black uppercase tracking-widest">오늘 {{ participantCount.toLocaleString() }}명 예측 완료</p>
              </div>

              <!-- League Schedule Info -->
              <div class="mt-6 flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group/schedule">
                <div class="absolute -top-10 -right-10 w-24 h-24 bg-brand-primary/5 blur-2xl rounded-full group-hover/schedule:bg-brand-primary/10 transition-colors"></div>
                <div class="flex justify-between items-center relative z-10">
                  <div class="flex flex-col gap-1">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">참여 가능 시간</span>
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-brand-primary" />
                      <span class="text-xs font-bold text-slate-200">전일 21:20 ~ 당일 08:00</span>
                    </div>
                  </div>
                  <div class="h-8 w-px bg-white/10"></div>
                  <div class="flex flex-col gap-1 items-end">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">결과 발표</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-slate-200">당일 20:20</span>
                      <UIcon name="i-heroicons-megaphone" class="w-3.5 h-3.5 text-brand-secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
              
              <button 
                @click="handleParticipation"
                class="group relative px-6 py-3.5 rounded-xl bg-brand-primary text-slate-900 font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all overflow-hidden mt-4 w-full text-center"
              >
                {{ isLeagueOpen ? '참여하기' : (isResultPublished ? '오늘의 결과 확인하기' : '리그 마감 (결과 대기 중)') }}
                <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          <!-- Decorative UI elements -->
          <div class="absolute -top-10 -right-10 w-48 h-48 bg-brand-primary/20 blur-[60px] rounded-full"></div>
          <div class="absolute top-1/2 -left-10 w-32 h-32 bg-brand-secondary/20 blur-[60px] rounded-full"></div>
        </div>
      </section>
 
      <!-- AI 추천 종목 -->
      <section v-if="recommendedStocks && recommendedStocks.length > 0" class="px-4 mb-10 relative group/ai-section">
        <div class="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-100 tracking-tight">AI 추천 종목</h3>
          </div>
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <UIcon name="i-heroicons-fire-20-solid" class="w-3.5 h-3.5 text-rose-500" />
            <span class="text-[10px] font-bold text-slate-400">AI 추천</span>
          </div>
        </div>
        
        <div class="relative">
          <!-- Navigation Buttons (Desktop only / Hover) -->
          <div class="absolute -left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover/ai-section:opacity-100 transition-opacity duration-300 hidden sm:block">
            <button 
              v-if="currentAiIndex > 0"
              @click="scrollAiTo(currentAiIndex - 1)"
              class="w-10 h-10 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto hover:bg-brand-primary hover:text-slate-900 transition-all shadow-xl"
            >
              <UIcon name="i-heroicons-chevron-left-20-solid" class="w-6 h-6" />
            </button>
          </div>
          
          <div class="absolute -right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover/ai-section:opacity-100 transition-opacity duration-300 hidden sm:block">
            <button 
              v-if="currentAiIndex < recommendedStocks.length - 1"
              @click="scrollAiTo(currentAiIndex + 1)"
              class="w-10 h-10 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto hover:bg-brand-primary hover:text-slate-900 transition-all shadow-xl"
            >
              <UIcon name="i-heroicons-chevron-right-20-solid" class="w-6 h-6" />
            </button>
          </div>

          <!-- Horizontal Scroll Container -->
          <div 
            ref="aiScrollContainer"
            @scroll="handleAiScroll"
            class="flex gap-3.5 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
          >
            <div 
              v-for="(stock, idx) in recommendedStocks" 
              :key="stock.id"
              class="w-[270px] flex-shrink-0 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-md rounded-[1.25rem] p-3.5 border border-white/10 relative overflow-hidden group hover:bg-white/[0.07] transition-all duration-300 snap-center"
            >
              <!-- Premium Background Glow -->
              <div class="absolute -top-10 -right-10 w-32 h-32 bg-brand-primary/10 blur-[50px] rounded-full group-hover:bg-brand-primary/20 transition-all"></div>
              
              <div class="relative z-10 flex flex-col gap-2">
                <!-- Row 1: All in one (Icon, Info, Price, Heart) -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex-shrink-0 flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10">
                      <UIcon name="i-heroicons-fire-20-solid" class="w-4.5 h-4.5 text-rose-500" />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <h4 class="font-black text-slate-100 text-[13px] tracking-tight leading-none truncate">{{ stock.name }}</h4>
                      <span class="text-[8px] font-mono text-slate-500 uppercase tracking-tighter mt-0.5 truncate">{{ stock.code }}</span>
                    </div>
                  </div>
                  
                  <div class="flex items-end gap-1.5 flex-shrink-0">
                    <div class="flex flex-col items-end">
                      <span class="text-[13px] font-black text-slate-50 tracking-tighter leading-none">{{ stock.last_price.toLocaleString() }}</span>
                      <div 
                        class="text-[9px] font-black leading-none mt-1"
                        :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                      >
                        {{ stock.change_amount > 0 ? '+' : '' }}{{ stock.change_amount.toLocaleString() }}
                        <span class="opacity-70 text-[8px]">({{ stock.change_rate }}%)</span>
                      </div>
                    </div>
                    
                    <button 
                      @click.stop="toggleHeart(stock.id)"
                      class="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 ml-1"
                      :class="isHearted(stock.id) ? 'text-rose-500 border-rose-500/20' : 'text-slate-500'"
                    >
                      <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <!-- Row 2: AI Summary (Marquee) -->
                <div class="relative overflow-hidden bg-white/5 rounded-lg h-6.5 flex items-center border border-white/5 group/marquee">
                  <div class="flex whitespace-nowrap animate-marquee-slow group-hover/marquee:animate-marquee-paused px-2">
                    <p class="text-[9px] text-slate-400 font-medium">
                      <span class="text-brand-primary/60 font-black mr-1 text-[8px]">AI</span>
                      {{ stock.summary }} &nbsp;&nbsp;&nbsp;&nbsp;&middot;&nbsp;&nbsp;&nbsp;&nbsp; {{ stock.summary }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Dots -->
          <div class="flex justify-center gap-1.5 mt-2">
            <button 
              v-for="(_, idx) in recommendedStocks" 
              :key="idx"
              @click="scrollAiTo(idx)"
              class="h-1.5 rounded-full transition-all duration-300"
              :class="idx === currentAiIndex ? 'w-6 bg-brand-primary' : 'w-1.5 bg-white/10 hover:bg-white/20'"
            ></button>
          </div>
        </div>
      </section>


 

      <!-- 최근 뉴스 & 공시 -->
      <section class="px-4 mb-8">
        <div class="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-100 tracking-tight">최근 주요 이슈</h3>
          </div>
            <NuxtLink to="/news" class="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline flex items-center gap-1.5 group/link">
              전체보기
              <UIcon name="i-heroicons-arrow-right-20-solid" class="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
            </NuxtLink>
        </div>

        <div class="flex flex-col gap-3">
          <div 
            v-for="item in recentNews" 
            :key="item.id"
            @click="navigateToNews(item)"
            class="bg-white/5 rounded-[1.25rem] p-5 border border-white/5 group hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden"
          >
            <div class="flex flex-col gap-3.5 relative z-10">
              <!-- 상단 행: 아이콘, 종목정보, 찜하기, 일시 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div 
                    class="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm"
                    :class="{
                      'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary': item.type === 'notice',
                      'bg-purple-500/10 border-purple-500/20 text-purple-400': item.type === 'ir',
                      'bg-brand-primary/10 border-brand-primary/20 text-brand-primary': item.type === 'news' || !item.type
                    }"
                  >
                    <UIcon 
                      :name="item.type === 'notice' ? 'i-heroicons-megaphone' : (item.type === 'ir' ? 'i-heroicons-presentation-chart-line' : 'i-heroicons-newspaper')" 
                      class="w-4.5 h-4.5" 
                    />
                  </div>
                  <div v-if="item.stockName" class="flex items-baseline gap-1.5">
                    <span class="text-xs font-black text-slate-200 tracking-tight">{{ item.stockName }}</span>
                    <span class="text-[9px] font-bold text-slate-500 font-mono tracking-tighter">{{ item.stockCode }}</span>
                  </div>
                  <span v-else class="text-[10px] text-slate-400 font-black uppercase tracking-widest">{{ item.source }}</span>
                </div>

                <div class="flex items-center gap-3">
                  <button 
                    v-if="item.stockId"
                    @click.stop="toggleHeart(item.stockId)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5"
                    :class="isHearted(item.stockId) ? 'text-rose-500 border-rose-500/20' : 'text-slate-500'"
                  >
                    <UIcon :name="isHearted(item.stockId) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-4 h-4" />
                  </button>
                  <span class="text-[10px] text-slate-500 font-bold opacity-70">{{ formatDate(item.published_at) }}</span>
                </div>
              </div>
              
              <!-- 중간 행: 제목 -->
              <h4 class="font-black text-slate-100 text-base leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
                {{ item.title }}
              </h4>

              <!-- 하단 행: AI 요약 -->
              <div v-if="item.llm_summary" class="bg-white/5 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                <p class="text-[11px] text-slate-400 leading-relaxed font-medium">
                  <span class="text-brand-primary/80 font-black mr-1.5">AI 요약</span>
                  {{ item.llm_summary }}
                </p>
              </div>
            </div>
            <!-- Subtitle glow effect -->
            <div class="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-secondary/5 blur-[40px] rounded-full group-hover:bg-brand-secondary/10 transition-colors"></div>
          </div>
          
          <div v-if="!recentNews.length" class="text-center py-16 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
            <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-slate-800 mb-4 mx-auto" />
            <p class="text-xs text-slate-600 font-black uppercase tracking-widest">데이터를 불러오는 중입니다</p>
          </div>
        </div>
      </section>
    </main>
 

    
    <BottomNav />
 

  </div>
</template>
 
<script setup lang="ts">
import { repairNewsUrl } from '~/utils/stock'
const { dailyStocks, recommendedStocks, hearts, myPredictions, participantCount, totalMemberCount, refresh, fetchWishlist, fetchPredictions, toggleHeart, fetchParticipantCount, fetchNews, refreshMarketCap, isLeagueOpen, isResultPublished } = useStock()
const isGuideOpen = ref(false)
const recentNews = ref<any[]>([])

// AI 추천 종목 내비게이션 상태
const aiScrollContainer = ref<HTMLElement | null>(null)
const currentAiIndex = ref(0)

const handleAiScroll = () => {
  if (!aiScrollContainer.value) return
  const container = aiScrollContainer.value
  const scrollLeft = container.scrollLeft
  
  if (recommendedStocks.value && recommendedStocks.value.length > 0) {
    const cardwidth = container.children[0]?.clientWidth || 270
    currentAiIndex.value = Math.round(scrollLeft / (cardwidth + 14)) // card + gap(3.5*4=14)
  }
}

const scrollAiTo = (index: number) => {
  if (!aiScrollContainer.value) return
  const container = aiScrollContainer.value
  const target = container.children[index] as HTMLElement
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
}

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
  const url = repairNewsUrl(item.url, item.stockCode, item.type)
  if (url) {
    window.open(url, '_blank')
  } else {
    navigateTo('/news')
  }
}

const user = useSupabaseUser()
const handleParticipation = () => {
  if (isLeagueOpen.value && !user.value) {
    if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
      navigateTo('/login')
    }
    return
  }
  navigateTo('/daily')
}

const isHearted = (id: number) => hearts.value.includes(Number(id))

onMounted(async () => {
  await Promise.all([
    refresh(),
    fetchWishlist(),
    refreshMarketCap(),
    fetchParticipantCount(),
    (async () => {
      const news = await fetchNews(5)
      recentNews.value = news
    })()
  ])
  
  // 종목 데이터가 로드된 후, 해당 종목들의 game_date를 기준으로 예측 데이터를 조회합니다.
  const targetDate = dailyStocks.value?.[0]?.game_date
  await fetchPredictions(targetDate)

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

@keyframes marquee-slow {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee-slow {
  animation: marquee-slow 15s linear infinite;
}
.animate-marquee-paused {
  animation-play-state: paused;
}
</style>
