<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 pb-20 overflow-x-hidden">
    <!-- Header -->
    <header class="p-6 flex justify-between items-center sticky top-0 bg-slate-900/80 backdrop-blur-md z-50">
      <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        주식 예측 리그
      </h1>
      <div class="flex items-center gap-4">
        <button class="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <div class="w-6 h-6 i-lucide-bell text-slate-300">🔔</div>
        </button>
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full border-2 border-slate-700 shadow-lg"></div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="px-6 py-8">
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 p-8 shadow-2xl">
        <div class="relative z-10">
          <p class="text-indigo-400 font-semibold mb-2">오늘의 예측 게임</p>
          <h2 class="text-3xl font-bold mb-4 leading-tight">상승할 종목을<br/>예측해 보세요!</h2>
          <div class="flex gap-2">
            <span class="px-3 py-1 bg-white/10 rounded-full text-sm backdrop-blur-sm border border-white/10">매일 5개 종목</span>
            <span class="px-3 py-1 bg-white/10 rounded-full text-sm backdrop-blur-sm border border-white/10">배당 1.5배</span>
          </div>
        </div>
        <!-- Decorative blobs -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full"></div>
      </div>
    </section>

    <!-- Stock List Section -->
    <section class="px-6 space-y-4">
      <div class="flex justify-between items-end mb-2">
        <h3 class="text-lg font-semibold text-slate-300">오늘의 종목 (5)</h3>
        <p class="text-sm text-slate-500">20:20 결과 발표</p>
      </div>

      <div v-for="stock in dailyStocks" :key="stock.id" 
           class="relative overflow-visible group">
        <!-- Stock Card -->
        <div 
          ref="cards"
          :data-id="stock.id"
          class="relative bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-600/50 cursor-pointer overflow-hidden"
          @contextmenu.prevent="toggleHeart(stock.id)"
        >
          <!-- Flick Hint Indicators -->
          <div class="absolute inset-x-0 top-0 h-1 bg-green-500/0 transition-all duration-300 group-hover:bg-green-500/20 shadow-[0_-10px_20px_rgba(34,197,94,0.3)]"></div>
          <div class="absolute inset-x-0 bottom-0 h-1 bg-red-500/0 transition-all duration-300 group-hover:bg-red-500/20 shadow-[0_10px_20px_rgba(239,68,68,0.3)]"></div>

          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-slate-500 font-mono">{{ stock.code }}</span>
                <button v-if="isHearted(stock.id)" @click.stop="toggleHeart(stock.id)" class="text-red-500 text-sm">❤️</button>
              </div>
              <h4 class="text-xl font-bold">{{ stock.name }}</h4>
            </div>
            <div class="text-right">
              <div class="text-lg font-semibold tabular-nums" :class="stock.change >= 0 ? 'text-red-400' : 'text-blue-400'">
                {{ stock.price.toLocaleString() }}
              </div>
              <div class="text-xs tabular-nums" :class="stock.change >= 0 ? 'text-red-400/80' : 'text-blue-400/80'">
                {{ stock.change >= 0 ? '▲' : '▼' }} {{ Math.abs(stock.change).toLocaleString() }} ({{ stock.changeRate }}%)
              </div>
            </div>
          </div>
          
          <div class="bg-slate-900/40 rounded-xl p-3 border border-white/5">
            <p class="text-sm text-slate-400 leading-relaxed italic">
              "{{ stock.summary }}"
            </p>
          </div>

          <!-- Prediction Status -->
          <div v-if="getPrediction(stock.id)" 
               class="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] rounded-2xl border-2 transition-all duration-500"
               :class="getPrediction(stock.id) === 'up' ? 'border-green-500/50' : 'border-red-500/50'"
          >
             <span class="text-2xl font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r"
                   :class="getPrediction(stock.id) === 'up' ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'"
             >
                {{ getPrediction(stock.id) === 'up' ? '상승 예측 중 ↑' : '하락 예측 중 ↓' }}
             </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Nav -->
    <nav class="fixed bottom-0 inset-x-0 h-16 bg-slate-800/90 backdrop-blur-xl border-t border-slate-700 flex justify-around items-center px-6 z-50">
      <button class="flex flex-col items-center gap-1 text-blue-400">
        <span class="text-xl">🎮</span>
        <span class="text-[10px] font-medium">게임</span>
      </button>
      <button class="flex flex-col items-center gap-1 text-slate-500">
        <span class="text-xl">🏆</span>
        <span class="text-[10px] font-medium">랭킹</span>
      </button>
      <button class="flex flex-col items-center gap-1 text-slate-500">
        <span class="text-xl">❤️</span>
        <span class="text-[10px] font-medium">찜목록</span>
      </button>
      <button class="flex flex-col items-center gap-1 text-slate-500">
        <span class="text-xl">👤</span>
        <span class="text-[10px] font-medium">마이</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
const { dailyStocks, myPredictions, predict } = useStock()
const hearts = ref<number[]>([])

const toggleHeart = (id: number) => {
  const index = hearts.value.indexOf(id)
  if (index > -1) {
    hearts.value.splice(index, 1)
  } else {
    hearts.value.push(id)
  }
}

const isHearted = (id: number) => hearts.value.includes(id)
const getPrediction = (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction

// Swipe Logic for Each Card
const cards = ref<HTMLElement[]>([])

onMounted(() => {
  cards.value.forEach((card) => {
    const id = Number(card.dataset.id)
    const { direction, isSwiping, lengthY } = useSwipe(card, {
      threshold: 50,
      onSwipeEnd: (e, direction) => {
        if (direction === 'up') {
          predict(id, 'up')
        } else if (direction === 'down') {
          predict(id, 'down')
        }
      }
    })
  })
})
</script>

<style scoped>
/* Smooth indicator animations */
.group:hover div[class*="bg-green-500"] {
  height: 8px;
  background-color: rgba(34, 197, 94, 0.4);
}
.group:hover div[class*="bg-red-500"] {
  height: 8px;
  background-color: rgba(239, 68, 68, 0.4);
}
</style>
