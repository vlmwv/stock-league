<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-clip selection:bg-brand-primary/30">
    <TopHeader />
 
    <main class="max-w-md mx-auto">
      <!-- Hero Section (Premium Welcome Card) -->
      <section class="px-4 py-4">
        <div class="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-transparent border border-white/10 p-6 shadow-3xl">
          <div class="relative z-10">
            <h2 class="text-2xl sm:text-3xl font-black mb-3 leading-tight tracking-tighter text-slate-100">
              투자 트렌드를 <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">한눈에 확인하세요!</span>
            </h2>
            <p class="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed mb-1">
              AI 추천 종목과 실시간 트렌드 테마를 통해
            </p>
            <p class="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
              더 빠르고 정확한 투자 인사이트를 만나보세요. 📈
            </p>
          </div>
          <!-- Decorative UI elements -->
          <div class="absolute -top-10 -right-10 w-48 h-48 bg-brand-primary/20 blur-[60px] rounded-full"/>
          <div class="absolute top-1/2 -left-10 w-32 h-32 bg-brand-secondary/20 blur-[60px] rounded-full"/>
        </div>
      </section>
 
      <!-- 글로벌 시장 지수 섹션 -->
      <section class="px-4 mb-8">
        <div class="flex items-center justify-between px-1 mb-3">
          <h3 class="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"/>
            글로벌 시장 지수
          </h3>
          <span 
            class="text-[10px] font-bold transition-all duration-300 flex items-center gap-1"
            :class="indicesSource === 'api' ? 'text-emerald-400 font-extrabold' : 'text-slate-500'"
          >
            <span v-if="indicesSource === 'api'" class="w-1 h-1 rounded-full bg-emerald-400 animate-ping"/>
            {{ indicesSource === 'api' ? '실시간 반영' : indicesSource === 'loading' ? '지수 로딩 중...' : '실시간 모사' }}
          </span>
        </div>

        <!-- 가로 스크롤 대신 한 화면에 2행 4열로 꽉 차게 들어오는 그리드 대시보드 (4열 배치 활용) -->
        <div class="grid grid-cols-4 gap-1.5 px-1">
          <div 
            v-for="indexItem in marketIndices" 
            :key="indexItem.name"
            class="glass-dark border border-white/5 rounded-xl p-2.5 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[76px] transition-all hover:bg-white/[0.04]"
          >
            <!-- 백그라운드 그라데이션 광채 -->
            <div 
              class="absolute -top-10 -right-10 w-14 h-14 blur-xl rounded-full transition-opacity duration-500"
              :class="indexItem.changeRate >= 0 ? 'bg-rose-500/10' : 'bg-indigo-500/10'"
            />

            <!-- 1라인: 지수명 (한 줄로 깔끔하게 노출) -->
            <div class="relative z-10 flex flex-col min-w-0">
              <span class="text-[7px] font-black text-slate-500 tracking-wider leading-none uppercase">{{ indexItem.region }}</span>
              <h4 class="text-[9px] font-black text-slate-200 group-hover:text-brand-primary transition-colors leading-tight truncate mt-0.5">
                {{ indexItem.name === '필라델피아 반도체' ? '필라반도체' : indexItem.name }}
              </h4>
            </div>

            <!-- 2라인: 지수 값 (독립된 한 줄로 표시) -->
            <div class="relative z-10 flex flex-col mt-1.5 min-w-0 leading-none">
              <span class="text-[10px] font-mono font-black text-slate-50 tracking-tighter truncate leading-none">
                {{ indexItem.value.toLocaleString(undefined, { minimumFractionDigits: indexItem.name.includes('환율') ? 0 : 0, maximumFractionDigits: 1 }) }}{{ indexItem.name.includes('환율') ? '원' : indexItem.name.includes('원유') ? '$' : 'p' }}
              </span>
              
              <!-- 3라인: 변동율 (다른 줄로 완전히 분리해 표시) -->
              <span 
                class="text-[8px] font-mono font-black tracking-tighter flex items-center leading-none mt-1"
                :class="indexItem.changeRate >= 0 ? 'text-rose-400' : 'text-indigo-400'"
              >
                <UIcon :name="indexItem.changeRate >= 0 ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" class="w-1.5 h-1.5 mr-0.5 flex-shrink-0" />
                {{ indexItem.changeRate >= 0 ? '+' : '' }}{{ indexItem.changeRate }}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 오늘의 테마 섹션 -->
      <section v-if="themes && themes.length > 0" class="px-4 mb-10">
        <div class="glass-dark rounded-[2rem] p-4 sm:p-6 border border-white/5 relative overflow-hidden shadow-2xl">
          <!-- 헤더 -->
          <div class="flex items-center justify-between mb-6 px-1">
            <div class="flex flex-col gap-0.5">
              <h3 class="text-xl font-black text-slate-100 tracking-tight">오늘의 테마</h3>
              <span class="text-[10px] font-bold text-slate-500">
                {{ todayKstDisplay }} 기준 · 평균 등락률
              </span>
            </div>
            <NuxtLink to="/stocks?tab=themes" class="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg group/plus">
              <UIcon name="i-heroicons-plus-20-solid" class="w-5 h-5 transition-transform group-hover/plus:rotate-90" />
            </NuxtLink>
          </div>

          <!-- 테마 카드 그리드 -->
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="(theme, index) in themes.slice(0, 6)"
              :key="theme.sector"
              class="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl p-2.5 transition-all duration-300 cursor-pointer active:scale-95 flex flex-col justify-between min-h-[84px] relative overflow-hidden group shadow-inner"
              @click="handleOpenThemeModal(theme)"
            >
              <!-- 은은한 무늬/그라데이션 효과 -->
              <div class="absolute -top-12 -right-12 w-20 h-20 bg-brand-primary/5 blur-2xl rounded-full group-hover:bg-brand-primary/10 transition-all duration-500"/>

              <div>
                <!-- 순위 및 개수 -->
                <div class="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <span>#{{ index + 1 }}</span>
                  <span>{{ theme.stock_count }}개</span>
                </div>
                <!-- 테마 이름 -->
                <h4 class="font-black text-slate-100 text-[11px] tracking-tight leading-tight mt-1.5 line-clamp-2 min-h-[2.4em] group-hover:text-brand-primary transition-colors">
                  {{ theme.sector }}
                </h4>
              </div>

              <!-- 등락률 배지 -->
              <div class="mt-2 flex">
                <span
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tight flex items-center gap-0.5"
                  :class="theme.avg_change_rate >= 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'"
                >
                  <UIcon :name="theme.avg_change_rate >= 0 ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" class="w-2.5 h-2.5" />
                  {{ theme.avg_change_rate >= 0 ? '+' : '' }}{{ theme.avg_change_rate }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- AI 추천 종목 (More Compact & Harmonious) -->
      <section v-if="recommendedStocks && recommendedStocks.length > 0" class="px-4 mb-10 relative group/ai-section">
        <div class="flex justify-between items-end mb-4 px-2">
          <div class="flex items-center gap-2">
            <div class="flex flex-col">
              <h3 class="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                AI 추천 종목
                <span v-if="globalAiStats.totalProcessed > 0" class="text-xs font-black text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/10 backdrop-blur-sm animate-fade-in whitespace-nowrap leading-none">
                  총 {{ globalAiStats.totalProcessed }}개 중 {{ globalAiStats.totalWins }}개 적중 ({{ Math.round((globalAiStats.totalWins / globalAiStats.totalProcessed) * 100) }}%)
                </span>
              </h3>
            </div>
          </div>
          <div class="flex items-center gap-3">

            <NuxtLink to="/ai?sub=history" class="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-brand-primary transition-all active:scale-95 shadow-sm">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink to="/stocks?tab=aiRecommendation" class="w-7 h-7 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg shadow-brand-primary/10">
              <UIcon name="i-heroicons-plus-20-solid" class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
        
        <div class="flex flex-col gap-3">
          <div 
            v-for="stock in recommendedStocks" 
            :key="stock.id"
            class="w-full bg-white/[0.04] backdrop-blur-md rounded-[1.25rem] p-4 border border-white/5 relative overflow-hidden group hover:bg-white/[0.08] transition-all duration-300 cursor-pointer shadow-sm"
            @click="navigateToStock(stock.code)"
          >
            <!-- Subtle Background Glow -->
            <div class="absolute -top-10 -right-10 w-24 h-24 bg-brand-primary/5 blur-[40px] rounded-full group-hover:bg-brand-primary/10 transition-all"/>
            
            <div class="relative z-10 flex flex-col gap-3">
              <!-- Row 1: Icon, Info, Price, Heart -->
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <div class="flex flex-col min-w-0">
                    <h4 class="font-black text-slate-100 text-base tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{{ stock.name }}</h4>
                    <div class="flex items-center gap-1.5 mt-1">
                      <span class="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{{ stock.code }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-end gap-2 flex-shrink-0 mt-0.5">
                  <div class="flex flex-col items-end">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span v-if="stock.ai_score !== undefined && stock.ai_score !== null" class="text-[10px] font-black text-emerald-400/80">{{ stock.ai_score }}점</span>
                      <span v-if="stock.ai_recommendation_count > 0" class="text-[10px] font-black text-brand-primary/80">{{ stock.ai_recommendation_count }}회</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm font-black text-slate-50 tracking-tighter leading-none">{{ stock.last_price.toLocaleString() }}</span>
                      <span v-if="stock.target_price" class="text-xs font-bold text-emerald-400 tracking-tighter leading-none flex items-center gap-0.5">
                        <span class="text-[10px] opacity-60">→</span>
                        {{ stock.target_price.toLocaleString() }}
                      </span>
                    </div>
                    <div 
                      class="text-[10px] font-black leading-none mt-1"
                      :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                    >
                      {{ stock.change_amount > 0 ? '+' : '' }}{{ stock.change_amount.toLocaleString() }}
                      <span class="opacity-60">({{ stock.change_rate }}%)</span>
                    </div>
                  </div>
                  
                  <button 
                    class="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5"
                    :class="isHearted(stock.id) ? 'text-rose-500 border-rose-500/20' : 'text-slate-600'"
                    @click.stop="handleOpenModal(stock.id)"
                  >
                    <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Row 2: AI Summary (Static Text Layout) -->
              <div class="relative bg-white/5 rounded-lg py-1.5 px-3 border border-white/5 flex items-center">
                <!-- 요약 텍스트 영역 (클릭 시 전체 보기) -->
                <UPopover mode="click" :popper="{ placement: 'top', offsetDistance: 12 }" class="w-full">
                  <div class="w-full cursor-help hover:bg-white/5 transition-colors rounded-md">
                    <p class="text-xs text-slate-400 font-medium leading-normal truncate">
                      {{ stock.summary }}
                    </p>
                  </div>
                  
                  <template #content>
                    <div class="px-4 py-3 max-w-[280px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl ring-1 ring-white/5">
                      <div class="flex items-center gap-1.5 mb-2 opacity-60">
                        <UIcon name="i-heroicons-sparkles" class="w-3 h-3 text-brand-primary" />
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest">AI INSIGHT</span>
                      </div>
                      <p class="text-sm text-slate-300 leading-relaxed font-medium">
                        {{ stock.summary }}
                      </p>
                    </div>
                  </template>
                </UPopover>
              </div>

            </div>
          </div>
        </div>
      </section>

      <!-- 최근 뉴스 & 공시 -->
      <section class="px-4 mb-8">
        <div class="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-100 tracking-tight">최근 주요 이슈</h3>
          </div>
            <NuxtLink to="/info?tab=news" class="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg group/plus">
              <UIcon name="i-heroicons-plus-20-solid" class="w-5 h-5 transition-transform group-hover/plus:rotate-90" />
            </NuxtLink>
        </div>

        <div class="flex flex-col gap-4">
          <NewsPanelCard
            v-for="item in recentNews"
            :key="item.id"
            :item="item"
            class="w-full animate-fade-in-up"
            :is-hearted="isHearted(item.stockId)"
            :formatted-date="formatDate(item.published_at)"
            @navigate-news="navigateToNews(item)"
            @open-wishlist-modal="handleOpenModal"
            @navigate-stock="(stockCode) => navigateToStock(stockCode)"
          />
          
          <div v-if="!recentNews.length" class="w-full text-center py-16 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 mx-4">
            <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-slate-800 mb-4 mx-auto" />
            <p class="text-sm text-slate-600 font-black uppercase tracking-widest">데이터를 불러오는 중입니다</p>
          </div>
        </div>
      </section>
    </main>
 

    
    <BottomNav />
    
    <WishlistGroupModal 
      v-model:open="isGroupModalOpen"
      :stock-id="selectedStockId"
      :initial-group-ids="currentStockGroupIds"
    />
    
    <ThemeModal 
      v-model:open="isThemeModalOpen"
      :theme="selectedTheme"
    />
  </div>
</template>
 
<script setup lang="ts">
import { repairNewsUrl } from '~/utils/stock'
const { 
  recommendedStocks, 
  hearts, 
  fetchWishlist, 
  fetchNews, 
  fetchGlobalAiStats, 
  refreshAll,
  wishlistsWithGroups,
  themes,
  fetchThemes
} = useStock()

const isGroupModalOpen = ref(false)
const isThemeModalOpen = ref(false)
const selectedStockId = ref<number | null>(null)
const selectedTheme = ref<any>(null)

// 실시간 지수 데이터 소스 상태 ('api' | 'fallback' | 'loading')
const indicesSource = ref<'api' | 'fallback' | 'loading'>('loading')
const isFetchingIndices = ref(false)

// 목업 지수 데이터 (기본값 및 폴백용 - 외환/원자재/반도체 포함)
const marketIndices = ref([
  { region: '대한민국', name: 'KOSPI', value: 2654.21, changeRate: 1.20 },
  { region: '대한민국', name: 'KOSDAQ', value: 875.40, changeRate: -0.40 },
  { region: '미국', name: 'S&P 500', value: 5137.08, changeRate: 0.85 },
  { region: '미국', name: 'NASDAQ', value: 16274.94, changeRate: 1.14 },
  { region: '미국', name: 'Dow Jones', value: 39087.38, changeRate: 0.23 },
  { region: '미국', name: '필라델피아 반도체', value: 5240.50, changeRate: 1.15 },
  { region: '외환', name: '원/달러 환율', value: 1365.20, changeRate: 0.25 },
  { region: '원자재', name: 'WTI 원유', value: 78.45, changeRate: -1.12 }
])

const loadMarketIndices = async () => {
  if (isFetchingIndices.value) return
  try {
    isFetchingIndices.value = true
    const res = await $fetch<any>('/api/stocks/indices')
    if (res && res.success && res.data) {
      marketIndices.value = res.data
      indicesSource.value = res.source
    } else {
      indicesSource.value = 'fallback'
    }
  } catch (error) {
    console.error('Failed to load real-time market indices:', error)
    indicesSource.value = 'fallback'
  } finally {
    isFetchingIndices.value = false
  }
}

const handleOpenThemeModal = (theme: any) => {
  selectedTheme.value = theme
  isThemeModalOpen.value = true
}

const todayKstDisplay = computed(() => {
  const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
  return new Intl.DateTimeFormat('sv-SE', options).format(new Date())
})
const router = useRouter()
const navigateToStock = (code: string) => {
  if (code) {
    router.push('/stocks/' + code)
  }
}
const currentStockGroupIds = computed(() => {
  if (!selectedStockId.value) return []
  return wishlistsWithGroups.value
    .filter(w => w.stock_id === selectedStockId.value)
    .map(w => w.group_id)
})

const handleOpenModal = (id: number) => {
  selectedStockId.value = id
  isGroupModalOpen.value = true
}



const recentNews = ref<any[]>([])
const globalAiStats = ref({ totalWins: 0, totalProcessed: 0 })

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
    navigateTo('/info?tab=news')
  }
}


const isHearted = (id: number) => hearts.value.includes(Number(id))

onMounted(async () => {
  await Promise.all([
    refreshAll(),
    fetchThemes(),
    loadMarketIndices(),
    (async () => {
      const response = await fetchNews(5)
      recentNews.value = response.data || []
    })(),
    (async () => {
      globalAiStats.value = await fetchGlobalAiStats()
    })()
  ])

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
