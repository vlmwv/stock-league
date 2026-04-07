<template>
  <div class="min-h-screen bg-bg-deep pb-12 overflow-x-hidden">
    <div class="max-w-md mx-auto relative">
      <!-- 상단 액션 바 -->
      <nav class="sticky top-0 z-40 px-6 py-4 flex items-center justify-between bg-bg-deep/80 backdrop-blur-xl">
        <button @click="router.back()" class="w-10 h-10 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors">
          <UIcon name="i-heroicons-chevron-left-20-solid" class="w-6 h-6" />
        </button>
        <div class="flex items-center gap-2">
           <button
            v-if="stock"
            @click="handleToggleHeart(stock.id)"
            class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
            :class="isHearted(stock.id) ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800/50 text-slate-600 hover:text-slate-400'"
          >
            <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main v-if="stock" class="px-6 space-y-8 animate-fade-in">
        <!-- 종목 헤더 -->
        <header>
          <div class="flex items-baseline gap-2 mb-1">
            <h1 class="text-3xl font-black text-slate-100 tracking-tight">{{ stock.name }}</h1>
            <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ stock.code }}</span>
          </div>
          <p class="text-sm text-slate-400 font-medium opacity-80 mt-1">{{ stock.sector || '주요 종목' }}</p>
          
          <div class="mt-6 flex flex-col gap-1">
            <div class="text-4xl font-black text-slate-100 flex items-baseline gap-1">
              {{ stock.last_price?.toLocaleString() }}
              <span class="text-base font-bold text-slate-500">원</span>
            </div>
            <div class="flex items-center gap-2 font-black text-sm" :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'">
              <span>{{ stock.change_amount >= 0 ? '▲' : '▼' }} {{ Math.abs(stock.change_amount).toLocaleString() }}</span>
              <span class="w-1 h-1 rounded-full bg-slate-700"></span>
              <span>{{ stock.change_amount >= 0 ? '+' : '' }}{{ stock.change_rate }}%</span>
            </div>
          </div>
        </header>

        <!-- 차트 섹션 -->
        <section class="glass-dark rounded-[2.5rem] p-6 border border-white/5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Price Chart</h3>
            <div class="px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 text-[10px] font-black text-slate-400">
              최근 30일
            </div>
          </div>
          
          <div v-if="chartSeries.length > 0" class="min-h-[220px]">
            <client-only>
              <apexchart
                type="area"
                height="220"
                :options="chartOptions"
                :series="chartSeries"
              />
            </client-only>
          </div>
          <div v-else class="h-[220px] flex items-center justify-center text-slate-600 text-sm font-bold italic">
            충분한 가격 데이터가 없습니다.
          </div>
        </section>

        <!-- 정보 카드들 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="glass-dark rounded-3xl p-5 border border-white/5">
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">시가총액 순위</p>
            <p class="text-xl font-black text-slate-200">{{ stock.market_cap_rank || '-' }}위</p>
          </div>
          <div class="glass-dark rounded-3xl p-5 border border-white/5">
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">찜한 사용자</p>
            <p class="text-xl font-black text-slate-200">{{ stock.wishlist_count || 0 }}명</p>
          </div>
        </div>

        <!-- 가격 이력 상세 -->
        <section class="space-y-4">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">Price History</h3>
          <div class="space-y-3">
            <div v-for="item in priceHistory" :key="item.price_date" class="glass-dark rounded-2xl p-4 border border-white/5 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-slate-200">{{ formatDate(item.price_date) }}</p>
                <p class="text-[10px] text-slate-500 mt-0.5">{{ item.price_date }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-black text-slate-200">{{ item.close_price?.toLocaleString() }}</p>
                <p class="text-[10px] font-black" :class="item.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'">
                  {{ item.change_amount >= 0 ? '+' : '' }}{{ item.change_rate }}%
                </p>
              </div>
            </div>
            
            <div v-if="priceHistory.length === 0" class="py-12 text-center">
              <p class="text-sm text-slate-600 font-medium italic">가격 기록이 없습니다.</p>
            </div>
          </div>
        </section>
      </main>

      <!-- 로딩 상태 -->
      <div v-else class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 font-bold animate-pulse uppercase tracking-widest">Loading Stock Info...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { fetchStockById, fetchPriceHistory, hearts, toggleHeart, fetchWishlist } = useStock()

const id = parseInt(route.params.id as string)

const stock = ref<any>(null)
const priceHistory = ref<any[]>([])

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(d)
}

const isHearted = (id: number) => hearts.value.includes(Number(id))

const handleToggleHeart = async (stockId: number) => {
  await toggleHeart(stockId)
}

const chartSeries = computed(() => {
  if (priceHistory.value.length === 0) return []
  // 차트는 시간순(오름차순)으로 그려야 하므로 가져온 최신순 데이터를 사용 시 역순으로 정렬
  const dataForChart = [...priceHistory.value].reverse()
  return [{
    name: '종가',
    data: dataForChart.map(h => ({
      x: h.price_date,
      y: h.close_price
    }))
  }]
})

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    sparkline: { enabled: false },
    background: 'transparent',
    fontFamily: 'Pretendard, Inter, sans-serif'
  },
  colors: ['#6366f1'], // Indigo 500 (brand-primary)
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.6,
      opacityTo: 0.1,
      stops: [0, 100]
    }
  },
  stroke: {
    curve: 'smooth',
    width: 3,
    lineCap: 'round'
  },
  grid: {
    show: false,
    padding: { left: -10, right: 0, top: 0, bottom: 0 }
  },
  xaxis: {
    type: 'datetime',
    labels: { show: false },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    show: false
  },
  tooltip: {
    theme: 'dark',
    x: { format: 'MM월 dd일' },
    y: {
      formatter: (val: number) => val.toLocaleString() + '원'
    },
    style: {
      fontSize: '10px'
    }
  },
  markers: {
    size: 0,
    hover: { size: 5 }
  }
}))

onMounted(async () => {
  const [stockData, historyData] = await Promise.all([
    fetchStockById(id),
    fetchPriceHistory(id),
    fetchWishlist()
  ])
  
  if (!stockData) {
    alert('존재하지 않는 종목입니다.')
    router.back()
    return
  }
  
  stock.value = stockData
  priceHistory.value = historyData
})
</script>

<style scoped>
.glass-dark {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.animate-fade-in {
  animation: fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
