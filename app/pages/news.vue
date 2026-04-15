<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto">
      <!-- 헤더 -->
      <section class="px-6 pt-8 pb-4">
        <div class="flex items-baseline justify-between mb-4">
          <h2 class="text-3xl font-black text-slate-100 tracking-tight">최신 뉴스</h2>
          <p v-if="totalCount > 0" class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            전체 <span class="text-brand-primary">{{ totalCount.toLocaleString() }}</span>건
          </p>
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
          <p class="text-sm text-slate-500 font-medium">등록된 뉴스가 없습니다.</p>
        </div>

        <template v-else>
          <NewsPanelCard
            v-for="item in newsItems"
            :key="item.id"
            :item="item"
            :is-hearted="isHearted(item.stockId)"
            :formatted-date="formatDate(item.published_at)"
            @navigate-news="navigateToNews(item)"
            @toggle-heart="toggleHeart"
            @navigate-stock="(stockCode) => navigateTo('/stocks/' + stockCode)"
          />

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
  const url = repairNewsUrl(item.url, item.stockCode)
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

    const response = await fetchNews(pageSize, page.value, 'all')
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
