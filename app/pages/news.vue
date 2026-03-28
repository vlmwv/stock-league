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
        <h2 class="text-3xl font-black text-slate-100 tracking-tight mb-1">뉴스 & 공시</h2>
        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Market Insights</p>
      </section>

      <!-- 뉴스 목록 -->
      <section class="px-6 space-y-6 mt-6 animate-fade-in">
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-4">
          <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">데이터 로드 중...</p>
        </div>

        <div v-else-if="newsItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <UIcon name="i-heroicons-newspaper" class="w-12 h-12 text-slate-700 mb-4" />
          <p class="text-sm text-slate-500 font-medium">최근 등록된 뉴스나 공시가 없습니다.</p>
        </div>

        <div
          v-else
          v-for="(item, index) in newsItems"
          :key="item.id"
          class="glass-dark rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-500"
        >
          <!-- 종목 태그 -->
          <div v-if="item.stockName" class="flex items-center gap-2 mb-4">
            <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {{ item.stockName }}
            </span>
            <span class="text-[9px] font-medium text-slate-600 uppercase">{{ item.stockCode }}</span>
          </div>

          <!-- 제목 -->
          <h3 class="text-lg font-bold text-slate-100 mb-3 leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
            {{ item.title }}
          </h3>

          <!-- LLM 요약 (Premium Card) -->
          <div v-if="item.llm_summary" class="bg-gradient-to-br from-brand-primary/5 to-transparent border-l-2 border-brand-primary/30 pl-4 py-1 mb-4">
            <p class="text-xs text-slate-400 leading-relaxed italic">
              "{{ item.llm_summary }}"
            </p>
          </div>

          <!-- 메타 정보 -->
          <div class="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{{ item.source }}</span>
              <span class="text-[9px] text-slate-600 font-medium">{{ formatDate(item.published_at) }}</span>
            </div>
            <a 
              :href="item.url || `https://m.stock.naver.com/item/${item.stockCode}/news`" 
              target="_blank"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-slate-900 transition-all duration-300"
            >
              상세보기
              <UIcon name="i-heroicons-arrow-top-right-on-square-20-solid" class="w-3.5 h-3.5" />
            </a>
          </div>

          <!-- Decorative gradient -->
          <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-primary/5 blur-[50px] rounded-full group-hover:bg-brand-primary/10 transition-colors"></div>
        </div>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
const { fetchNews } = useStock()

const newsItems = ref<any[]>([])
const isLoading = ref(true)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric'
  })
}

onMounted(async () => {
  try {
    const data = await fetchNews(30)
    newsItems.value = data
  } catch (error) {
    console.error('Failed to load news:', error)
  } finally {
    isLoading.value = false
  }
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
