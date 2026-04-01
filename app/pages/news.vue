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
          class="glass-dark rounded-[2.5rem] p-7 border border-white/5 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-500"
        >
          <div class="flex flex-col gap-4 relative z-10">
            <!-- 상단 행: 아이콘, 종목정보, 찜하기, 일시 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm"
                  :class="{
                    'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary': item.type === 'notice',
                    'bg-purple-500/10 border-purple-500/20 text-purple-400': item.type === 'ir',
                    'bg-brand-primary/10 border-brand-primary/20 text-brand-primary': item.type === 'news' || !item.type
                  }"
                >
                  <UIcon 
                    :name="item.type === 'notice' ? 'i-heroicons-megaphone' : (item.type === 'ir' ? 'i-heroicons-presentation-chart-line' : 'i-heroicons-newspaper')" 
                    class="w-5 h-5" 
                  />
                </div>
                <div v-if="item.stockName" class="flex items-baseline gap-2">
                  <span class="text-sm font-black text-slate-100 tracking-tight">{{ item.stockName }}</span>
                  <span class="text-[10px] font-bold text-slate-500 font-mono tracking-tighter">{{ item.stockCode }}</span>
                </div>
                <span v-else class="text-xs text-slate-400 font-black uppercase tracking-widest">{{ item.source }}</span>
              </div>

              <div class="flex items-center gap-4">
                <button 
                  v-if="item.stockId"
                  @click.stop="toggleHeart(item.stockId)"
                  class="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5"
                  :class="isHearted(item.stockId) ? 'text-rose-500 border-rose-500/20' : 'text-slate-500'"
                >
                  <UIcon :name="isHearted(item.stockId) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
                </button>
                <span class="text-[11px] text-slate-500 font-bold opacity-70">{{ formatDate(item.published_at) }}</span>
              </div>
            </div>

            <!-- 중간 행: 제목 -->
            <h3 class="text-xl font-bold text-slate-100 leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
              {{ item.title }}
            </h3>

            <!-- 하단 행: AI 요약 -->
            <div v-if="item.llm_summary" class="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
              <p class="text-xs text-slate-400 leading-relaxed font-medium">
                <span class="text-brand-primary/80 font-black mr-2">AI 요약</span>
                {{ item.llm_summary }}
              </p>
            </div>

            <!-- 상세보기 버튼 -->
            <div class="flex justify-end mt-2">
              <a 
                :href="repairNewsUrl(item.url, item.stockCode, item.type)" 
                target="_blank"
                class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-slate-900 transition-all duration-300 shadow-lg"
              >
                상세보기
                <UIcon name="i-heroicons-arrow-top-right-on-square-20-solid" class="w-4 h-4" />
              </a>
            </div>
          </div>

          <!-- Decorative gradient -->
          <div class="absolute -bottom-10 -right-10 w-48 h-48 bg-brand-primary/5 blur-[60px] rounded-full group-hover:bg-brand-primary/10 transition-colors"></div>
        </div>
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

const isHearted = (id: number) => hearts.value.includes(Number(id))

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
    const [newsData] = await Promise.all([
      fetchNews(30),
      fetchWishlist()
    ])
    newsItems.value = newsData
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
