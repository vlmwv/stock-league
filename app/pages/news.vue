<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto">
      <!-- 헤더 -->
      <section class="px-6 pt-8 pb-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
          <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">실시간 피드</span>
        </div>
        <div class="flex items-baseline justify-between mb-4">
          <h2 class="text-3xl font-black text-slate-100 tracking-tight">뉴스 & 공시</h2>
          <p v-if="totalCount > 0" class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            전체 <span class="text-brand-primary">{{ totalCount.toLocaleString() }}</span>건
          </p>
        </div>

        <!-- 범례 필터 -->
        <div class="flex flex-wrap gap-2">
          <button 
            v-for="type in filterTypes" 
            :key="type.value"
            @click="selectedType = type.value"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all duration-300"
            :class="selectedType === type.value 
              ? type.activeClass 
              : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'"
          >
            <UIcon v-if="type.icon" :name="type.icon" class="w-3.5 h-3.5" />
            <span class="text-[10px] font-black uppercase tracking-widest">{{ type.label }}</span>
          </button>
        </div>
      </section>

      <!-- 뉴스 목록 -->
      <section class="px-6 space-y-4 mt-6 animate-fade-in">
        <div v-if="isLoading && newsItems.length === 0" class="flex flex-col items-center justify-center py-20 gap-4">
          <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">데이터 로드 중...</p>
        </div>

        <div v-else-if="newsItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <UIcon name="i-heroicons-newspaper" class="w-12 h-12 text-slate-700 mb-4" />
          <p class="text-sm text-slate-500 font-medium">선택한 카테고리에 등록된 뉴스나 공시가 없습니다.</p>
        </div>

        <template v-else>
          <div
            v-for="(item, index) in newsItems"
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
                      'bg-purple-500/10 border-purple-500/20 text-purple-400': item.type === 'ir',
                      'bg-brand-primary/10 border-brand-primary/20 text-brand-primary': item.type === 'news' || !item.type
                    }"
                  >
                    <UIcon 
                      :name="item.type === 'ir' ? 'i-heroicons-presentation-chart-line' : 'i-heroicons-newspaper'" 
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

            <!-- Decorative gradient -->
            <div class="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-secondary/5 blur-[40px] rounded-full group-hover:bg-brand-secondary/10 transition-colors"></div>
          </div>

          <!-- 무한 스크롤 감지 요소 & 로딩 스피너 -->
          <div ref="sentinel" class="py-10 flex flex-col justify-center items-center gap-3">
            <div v-if="isFetchingMore" class="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
            <p v-else-if="!hasMore && newsItems.length > 0" class="text-[10px] text-slate-600 font-black uppercase tracking-widest opacity-40">마지막 뉴스입니다</p>
          </div>
        </template>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { repairNewsUrl } from '~/utils/stock'
const { fetchNews, toggleHeart, hearts, fetchWishlist } = useStock()

const newsItems = ref<any[]>([])
const isLoading = ref(true)
const selectedType = ref('all')
const totalCount = ref(0)

const filterTypes = [
  { label: '전체', value: 'all', icon: null, activeClass: 'bg-slate-100 border-slate-100 text-slate-900' },
  { label: '뉴스', value: 'news', icon: 'i-heroicons-newspaper', activeClass: 'bg-brand-primary/20 border-brand-primary/30 text-brand-primary' },
  { label: 'IR', value: 'ir', icon: 'i-heroicons-presentation-chart-line', activeClass: 'bg-purple-500/20 border-purple-500/30 text-purple-400' }
]

// 페이징 상태
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const isFetchingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)

const isHearted = (id: number) => hearts.value.includes(Number(id))

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
  
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric'
  })
}

const navigateToNews = (item: any) => {
  const url = repairNewsUrl(item.url, item.stockCode, item.type)
  if (url) {
    window.open(url, '_blank')
  }
}

const loadNews = async (isAppend = false) => {
  try {
    if (!isAppend) {
      isLoading.value = true
      page.value = 1
      hasMore.value = true
    } else {
      isFetchingMore.value = true
    }

    const response = await fetchNews(pageSize, page.value, selectedType.value)
    const data = response.data || []
    totalCount.value = response.count || 0
    
    if (isAppend) {
      newsItems.value = [...newsItems.value, ...data]
    } else {
      newsItems.value = data
    }

    // 더 가져올 데이터가 있는지 확인
    if (data.length < pageSize) {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Failed to load news:', error)
  } finally {
    isLoading.value = false
    isFetchingMore.value = false
  }
}

watch(selectedType, () => {
  loadNews()
})

const loadMore = () => {
  if (!hasMore.value || isFetchingMore.value || isLoading.value) return
  page.value++
  loadNews(true)
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  await Promise.all([
    loadNews(),
    fetchWishlist()
  ])

  // Intersection Observer 설정
  observer = new IntersectionObserver((entries) => {
    if (entries[0] && entries[0].isIntersecting) {
      loadMore()
    }
  }, { rootMargin: '200px' })

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
