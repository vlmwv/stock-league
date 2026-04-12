<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-clip selection:bg-brand-primary/30">
    <TopHeader />
 
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
                <div v-if="participantCount > 0" class="flex items-center gap-2">
                  <p class="text-xs text-slate-100 font-bold tracking-tight">
                    오늘 {{ participantCount.toLocaleString() }}명 예측 완료
                    <span class="text-slate-400 font-normal ml-1">(누적 {{ totalMemberCount.toLocaleString() }}명 참여 중)</span>
                  </p>
                </div>
                <div v-else class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                  <p class="text-xs text-slate-100 font-bold tracking-tight">
                    가장 먼저 예측에 참여해 보세요!
                    <span v-if="totalMemberCount > 0" class="text-slate-400 font-normal ml-1">(누적 {{ totalMemberCount.toLocaleString() }}명 참여 중)</span>
                  </p>
                </div>
              </div>

              <!-- League Schedule Info (Premium Redesign) -->
              <div class="mt-6 p-4 rounded-[1.25rem] bg-indigo-500/[0.03] border border-white/5 backdrop-blur-xl relative overflow-hidden group/schedule shadow-inner">
                <div class="absolute -top-12 -right-12 w-28 h-28 bg-brand-primary/10 blur-2xl rounded-full group-hover/schedule:bg-brand-primary/15 transition-all duration-700"></div>
                <div class="flex items-center justify-between relative z-10">
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-1.5 opacity-60">
                      <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-brand-primary" />
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">참여 가능</span>
                    </div>
                    <span class="text-xs font-bold text-slate-100 tracking-tight">전일 21:20 ~ 당일 08:00</span>
                  </div>
                  <div class="h-10 w-px bg-white/5 mx-4"></div>
                  <div class="flex flex-col gap-1.5 items-end text-right">
                    <div class="flex items-center gap-1.5 opacity-60">
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">결과 발표</span>
                      <UIcon name="i-heroicons-megaphone" class="w-3.5 h-3.5 text-brand-secondary" />
                    </div>
                    <span class="text-xs font-bold text-brand-secondary tracking-tight">당일 20:30 <span class="text-slate-400">발표</span></span>
                  </div>
                </div>
              </div>
            </div>
              
              <button 
                @click="handleParticipation"
                class="group relative px-6 py-3.5 rounded-xl bg-brand-primary text-slate-900 font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all overflow-hidden mt-4 w-full text-center"
              >
                {{ allPredicted ? '참여 완료 (내 예측 보기)' : (isLeagueOpen ? '참여하기' : (isResultPublished ? '오늘의 결과 확인하기' : (getKstTimeVal() >= 2120 ? '내일의 종목 준비 중' : '리그 마감 (결과 대기 중)'))) }}
                <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          <!-- Decorative UI elements -->
          <div class="absolute -top-10 -right-10 w-48 h-48 bg-brand-primary/20 blur-[60px] rounded-full"></div>
          <div class="absolute top-1/2 -left-10 w-32 h-32 bg-brand-secondary/20 blur-[60px] rounded-full"></div>
        </div>
      </section>
 
      <!-- AI 추천 종목 (More Compact & Harmonious) -->
      <section v-if="recommendedStocks && recommendedStocks.length > 0" class="px-4 mb-10 relative group/ai-section">
        <div class="flex justify-between items-end mb-4 px-2">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-orange-400" />
            </div>
            <div class="flex flex-col">
              <h3 class="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                AI 추천 종목
                <span v-if="globalAiStats.totalProcessed > 0" class="text-[9px] font-black text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/10 backdrop-blur-sm animate-fade-in whitespace-nowrap leading-none">
                  총 {{ globalAiStats.totalProcessed }}개 중 {{ globalAiStats.totalWins }}개 적중 ({{ Math.round((globalAiStats.totalWins / globalAiStats.totalProcessed) * 100) }}%)
                </span>
              </h3>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink to="/daily-history" class="text-[10px] font-black text-slate-500 hover:text-brand-primary uppercase tracking-widest transition-all flex items-center gap-1.5 ring-1 ring-white/5 px-2 py-1 rounded-lg bg-white/5">
              <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-brand-primary" />
              이력
            </NuxtLink>
            <NuxtLink to="/stocks?tab=aiRecommendation" class="w-7 h-7 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg shadow-brand-primary/10">
              <UIcon name="i-heroicons-plus-20-solid" class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
        
        <div class="relative">
          <!-- Navigation Buttons (Hidden on mobile, refined for desktop) -->
          <div class="absolute -left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover/ai-section:opacity-100 transition-opacity duration-300 hidden sm:block">
            <button 
              v-if="currentAiIndex > 0"
              @click="scrollAiTo(currentAiIndex - 1)"
              class="w-8 h-8 rounded-full bg-slate-900/90 border border-white/10 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg"
            >
              <UIcon name="i-heroicons-chevron-left-20-solid" class="w-5 h-5" />
            </button>
          </div>
          
          <div class="absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover/ai-section:opacity-100 transition-opacity duration-300 hidden sm:block">
            <button 
              v-if="currentAiIndex < recommendedStocks.length - 1"
              @click="scrollAiTo(currentAiIndex + 1)"
              class="w-8 h-8 rounded-full bg-slate-900/90 border border-white/10 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg"
            >
              <UIcon name="i-heroicons-chevron-right-20-solid" class="w-5 h-5" />
            </button>
          </div>

          <div 
            ref="aiScrollContainer"
            @scroll="handleAiScroll"
            class="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
          >
            <div 
              v-for="(stock, idx) in recommendedStocks" 
              :key="stock.id"
              @click="navigateTo('/stocks/' + stock.code)"
              class="w-[240px] flex-shrink-0 bg-white/[0.04] backdrop-blur-md rounded-[1.25rem] p-3 border border-white/5 relative overflow-hidden group hover:bg-white/[0.08] transition-all duration-300 snap-center cursor-pointer"
            >
              <!-- Subtle Background Glow -->
              <div class="absolute -top-10 -right-10 w-24 h-24 bg-brand-primary/5 blur-[40px] rounded-full group-hover:bg-brand-primary/10 transition-all"></div>
              
              <div class="relative z-10 flex flex-col gap-2.5">
                <!-- Row 1: Icon, Info, Price, Heart -->
                <div class="flex items-start justify-between gap-2.5">
                  <div class="flex items-start gap-2.5 min-w-0 flex-1">
                    <div class="flex flex-col min-w-0">
                      <h4 class="font-black text-slate-100 text-[12px] tracking-tight leading-tight line-clamp-2 min-h-[1.5em]">{{ stock.name }}</h4>
                      <div class="flex items-center gap-1.5 mt-1">
                        <span class="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">{{ stock.code }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-end gap-1.5 flex-shrink-0 mt-0.5">
                    <div class="flex flex-col items-end">
                      <span class="text-[12px] font-black text-slate-50 tracking-tighter leading-none">{{ stock.last_price.toLocaleString() }}</span>
                      <div 
                        class="text-[8px] font-black leading-none mt-1"
                        :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                      >
                        {{ stock.change_amount > 0 ? '+' : '' }}{{ stock.change_amount.toLocaleString() }}
                        <span class="opacity-60">({{ stock.change_rate }}%)</span>
                      </div>
                    </div>
                    
                    <button 
                      @click.stop="toggleHeart(stock.id)"
                      class="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5"
                      :class="isHearted(stock.id) ? 'text-rose-500 border-rose-500/20' : 'text-slate-600'"
                    >
                      <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Row 2: AI Summary (More Refined Marquee) -->
                <div class="relative overflow-hidden bg-white/5 rounded-lg h-7 flex items-center border border-white/5 group/marquee px-2 gap-1.5">
                  <!-- AI 점수 라벨 (고정) -->
                  <span v-if="stock.ai_score !== undefined && stock.ai_score !== null" class="flex items-center gap-1 text-[8px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md shrink-0 border border-emerald-400/20">
                    <UIcon name="i-heroicons-chart-bar-20-solid" class="w-3 h-3" />
                    {{ stock.ai_score }}점
                  </span>
                  <!-- AI 추천 횟수 라벨 -->
                  <span v-if="stock.ai_recommendation_count > 0" class="flex items-center gap-1 text-[8px] font-black text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-md border border-orange-400/20 shrink-0">
                    <UIcon name="i-heroicons-sparkles-20-solid" class="w-3 h-3" />
                    {{ stock.ai_recommendation_count }}회
                  </span>
                  <!-- AI 요약 라벨 삭제됨 -->
                  
                  <!-- 스크롤되는 요약 텍스트 영역 (클릭 시 전체 보기) -->
                  <UPopover mode="click" :popper="{ placement: 'top', offsetDistance: 12 }">
                    <div class="flex-1 overflow-hidden relative cursor-help group/summary hover:bg-white/5 transition-colors rounded-md py-0.5">
                      <div class="flex whitespace-nowrap animate-marquee-slow group-hover/marquee:animate-marquee-paused transition-all">
                        <p class="text-[9px] text-slate-400 font-medium leading-none flex items-center h-full">
                          {{ stock.summary }} &nbsp;&nbsp;&middot;&nbsp;&nbsp; {{ stock.summary }}
                        </p>
                      </div>
                    </div>
                    
                    <template #content>
                      <div class="px-4 py-3 max-w-[280px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl ring-1 ring-white/5">
                        <div class="flex items-center gap-1.5 mb-2 opacity-60">
                          <UIcon name="i-heroicons-sparkles" class="w-3 h-3 text-brand-primary" />
                          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI INSIGHT</span>
                        </div>
                        <p class="text-[11px] text-slate-300 leading-relaxed font-medium">
                          {{ stock.summary }}
                        </p>
                      </div>
                    </template>
                  </UPopover>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-center gap-1 mt-1">
            <div 
              v-for="(_, idx) in recommendedStocks" 
              :key="idx"
              class="h-1 rounded-full transition-all duration-300"
              :class="idx === currentAiIndex ? 'w-4 bg-brand-primary' : 'w-1 bg-white/10'"
            ></div>
          </div>
        </div>
      </section>

      <!-- 최근 뉴스 & 공시 -->
      <section class="px-4 mb-8">
        <div class="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-100 tracking-tight">최근 주요 이슈</h3>
          </div>
            <NuxtLink to="/news" class="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg group/plus">
              <UIcon name="i-heroicons-plus-20-solid" class="w-5 h-5 transition-transform group-hover/plus:rotate-90" />
            </NuxtLink>
        </div>

        <div class="flex flex-col gap-3">
          <div 
            v-for="item in recentNews" 
            :key="item.id"
            @click="navigateToNews(item)"
            class="bg-white/[0.03] rounded-[1.5rem] p-5 border border-white/5 group hover:bg-white/[0.07] transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
          >
            <div class="flex flex-col gap-4 relative z-10">
              <!-- 상단 행: 아이콘, 종목정보, 찜하기, 일시 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 duration-500 bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                  >
                    <UIcon 
                      name="i-heroicons-newspaper" 
                      class="w-5 h-5" 
                    />
                  </div>
                  <div v-if="item.stockName" class="flex flex-col gap-0.5">
                    <span class="text-[13px] font-black text-slate-200 tracking-tight leading-none">{{ item.stockName }}</span>
                    <span class="text-[9px] font-bold text-slate-500 font-mono tracking-tighter">{{ item.stockCode }}</span>
                  </div>
                  <span v-else class="text-[11px] text-slate-400 font-black uppercase tracking-widest">{{ item.source }}</span>
                </div>

                <div class="flex items-center gap-4">
                  <button 
                    v-if="item.stockId"
                    @click.stop="toggleHeart(item.stockId)"
                    class="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-90 border border-white/5"
                    :class="isHearted(item.stockId) ? 'text-rose-500 border-rose-500/20' : 'text-slate-600'"
                  >
                    <UIcon :name="isHearted(item.stockId) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-4.5 h-4.5" />
                  </button>
                  <span class="text-[10px] text-slate-500 font-bold opacity-60">{{ formatDate(item.published_at) }}</span>
                </div>
              </div>
              
              <!-- 중간 행: 제목 -->
              <h4 class="font-bold text-slate-100 text-[15px] leading-snug group-hover:text-brand-primary transition-colors line-clamp-2 tracking-tight">
                {{ item.title }}
              </h4>
 
              <div v-if="item.llm_summary" class="bg-indigo-500/[0.04] rounded-2xl p-3.5 border border-white/5 transition-colors group-hover:border-brand-primary/20">
                <div class="flex items-center gap-2 mb-1.5">
                  <span 
                    v-if="item.ai_score" 
                    class="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md border shadow-sm"
                    :class="[
                      item.ai_score > 55 ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' : 
                      item.ai_score < 45 ? 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' : 
                      'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    ]"
                  >
                    {{ item.ai_score }}점
                  </span>
                  <span class="text-brand-primary text-[10px] font-black opacity-80 uppercase tracking-wider">AI INSIGHT</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed font-medium">
                  {{ item.llm_summary }}
                </p>
              </div>
            </div>
            <!-- Subtitle glow effect -->
            <div class="absolute -bottom-12 -right-12 w-28 h-28 bg-brand-secondary/5 blur-[50px] rounded-full group-hover:bg-brand-secondary/10 transition-all duration-700"></div>
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
const { dailyStocks, recommendedStocks, hearts, myPredictions, participantCount, totalMemberCount, refresh, fetchWishlist, fetchPredictions, toggleHeart, fetchParticipantCount, fetchNews, refreshMarketCap, fetchGlobalAiStats, isLeagueOpen, isResultPublished, isGuideOpen, allPredicted, refreshAll } = useStock()

const kstTime = useState<{ hour: number, minute: number, timeVal: number }>('kst_time')
const getKstTimeVal = () => kstTime.value?.timeVal || 0

const recentNews = ref<any[]>([])
const globalAiStats = ref({ totalWins: 0, totalProcessed: 0 })

// AI 추천 종목 내비게이션 상태
const aiScrollContainer = ref<HTMLElement | null>(null)
const currentAiIndex = ref(0)

const handleAiScroll = () => {
  if (!aiScrollContainer.value) return
  const container = aiScrollContainer.value
  const scrollLeft = container.scrollLeft
  
  if (recommendedStocks.value && recommendedStocks.value.length > 0) {
    const cardwidth = container.children[0]?.clientWidth || 240
    currentAiIndex.value = Math.round(scrollLeft / (cardwidth + 12)) // card + gap(3=12)
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
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const navigateToNews = (item: any) => {
  const url = repairNewsUrl(item.url, item.stockCode)
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
    refreshAll(),
    (async () => {
      const response = await fetchNews(5)
      recentNews.value = response.data || []
    })(),
    (async () => {
      globalAiStats.value = await fetchGlobalAiStats()
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

@keyframes marquee-slow {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee-slow {
  animation: marquee-slow 10s linear infinite;
}
.animate-marquee-paused {
  animation-play-state: paused;
}
</style>
