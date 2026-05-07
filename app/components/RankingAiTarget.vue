<script setup lang="ts">
const { targetedStocks, pendingTargeted, refreshTargetedStocks } = useStock()

const calculateUpside = (current: number, target: number) => {
  if (!current || !target) return '0'
  const upside = ((target - current) / current) * 100
  return upside.toFixed(1)
}

const calculateChangeRate = (base: number, current: number) => {
  if (!base || !current) return '0'
  const change = ((current - base) / base) * 100
  return change.toFixed(1)
}

const router = useRouter()

const goToStock = (code: string) => {
  if (code) {
    router.push('/stocks/' + code)
  }
}

onMounted(() => {
  refreshTargetedStocks()
})
</script>

<template>
  <div class="animate-fade-in">


    <!-- Loading State -->
    <section v-if="pendingTargeted" class="space-y-4">
      <div v-for="i in 3" :key="i" class="glass-dark rounded-3xl p-6 border border-white/5 animate-pulse">
        <div class="flex justify-between items-start mb-6">
          <div class="flex gap-4">
            <div class="w-12 h-12 rounded-2xl bg-white/5"></div>
            <div class="space-y-2">
              <div class="h-3 w-16 bg-white/5 rounded"></div>
              <div class="h-6 w-32 bg-white/5 rounded"></div>
            </div>
          </div>
          <div class="w-20 h-8 bg-white/5 rounded-xl"></div>
        </div>
        <div class="h-20 w-full bg-white/5 rounded-2xl"></div>
      </div>
    </section>

    <!-- Empty State -->
    <section v-else-if="!targetedStocks || targetedStocks.length === 0" class="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div class="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-white/5">
        <UIcon name="i-heroicons-document-magnifying-glass" class="w-10 h-10 text-slate-500" />
      </div>
      <h3 class="text-lg font-black text-slate-100 mb-2">목표가 데이터가 없습니다</h3>
      <p class="text-xs text-slate-500 leading-relaxed font-medium">
        AI가 분석한 목표가 데이터가 아직 생성되지 않았습니다.<br>조금만 더 기다려 주세요!
      </p>
    </section>

    <!-- Targeted Stock List -->
    <section v-else class="space-y-6">
      <div 
        v-for="stock in targetedStocks" 
        :key="stock.daily_id"
        @click="goToStock(stock.code)"
        class="glass-dark rounded-3xl p-6 border border-white/5 relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-white/5 hover:border-emerald-500/30"
      >
        <!-- Header: Stock Info -->
        <div class="flex justify-between items-center mb-6 relative z-10">
          <div class="flex gap-4">
            <StockIcon :code="stock.code" :name="stock.name" size="md" />
            <div class="flex flex-col justify-center">
              <h4 class="text-xl font-black text-slate-100 group-hover:text-emerald-400 transition-colors tracking-tight">{{ stock.name }}</h4>
              <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{{ stock.code }}</span>
            </div>
          </div>
          <div class="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest">AI TARGET</span>
          </div>
        </div>

        <!-- Price Comparison: 추천시점 vs 현재 -->
        <div class="grid grid-cols-2 gap-3 mb-4 relative z-10">
          <div class="bg-slate-800/40 rounded-2xl p-4 border border-white/5 relative group/item">
            <div class="flex items-center gap-2 mb-2 opacity-60">
              <UIcon name="i-heroicons-calendar" class="w-3 h-3 text-slate-500" />
              <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest">추천 시점</p>
            </div>
            <p class="text-sm font-black text-slate-100">{{ stock.rec_price?.toLocaleString() }}<span class="text-[10px] ml-0.5 opacity-50">원</span></p>
            <p class="text-[8px] font-bold text-slate-500 mt-1">{{ stock.game_date }}</p>
          </div>

          <div class="bg-slate-800/40 rounded-2xl p-4 border border-white/5 relative">
            <div class="flex items-center justify-between mb-2 opacity-60">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="w-3 h-3 text-slate-500" />
                <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest">현재 시점</p>
              </div>
              <span class="text-[7px] font-black text-emerald-400 animate-pulse">LIVE</span>
            </div>
            <p class="text-sm font-black text-slate-100">{{ stock.last_price?.toLocaleString() }}<span class="text-[10px] ml-0.5 opacity-50">원</span></p>
            <div class="flex items-center gap-1 mt-1">
              <span 
                class="text-[9px] font-black"
                :class="Number(calculateChangeRate(stock.rec_price, stock.last_price)) >= 0 ? 'text-rose-400' : 'text-indigo-400'"
              >
                {{ Number(calculateChangeRate(stock.rec_price, stock.last_price)) >= 0 ? '▲' : '▼' }}
                {{ Math.abs(Number(calculateChangeRate(stock.rec_price, stock.last_price))) }}%
              </span>
              <span class="text-[7px] font-bold text-slate-600 uppercase tracking-widest ml-1">수익률</span>
            </div>
          </div>
        </div>

        <!-- Target Info Box -->
        <div class="relative bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-5 mb-6 overflow-hidden">
          <div class="absolute -right-4 -top-4 p-4 opacity-5 rotate-12">
            <UIcon name="i-heroicons-sparkles" class="w-24 h-24 text-emerald-400" />
          </div>
          
          <div class="grid grid-cols-2 gap-6 relative z-10">
            <div class="space-y-1">
              <p class="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest">AI 목표가</p>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-emerald-400 tracking-tighter">{{ stock.target_price.toLocaleString() }}</span>
                <span class="text-xs font-bold text-emerald-500/70">원</span>
              </div>
            </div>
            <div class="text-right space-y-1">
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">목표기준일</p>
              <p class="text-sm font-black text-slate-200 tracking-tight">{{ stock.target_date }}</p>
            </div>
          </div>

          <!-- Potential Upside -->
          <div class="mt-4 pt-4 border-t border-emerald-500/10 flex items-center justify-between relative z-10">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span class="text-[9px] font-bold text-slate-400">목표까지 기대 수익률</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-arrow-trending-up" class="w-4 h-4 text-emerald-400" />
              <span class="text-lg font-black text-emerald-400 tracking-tighter">+{{ calculateUpside(stock.last_price, stock.target_price) }}%</span>
            </div>
          </div>
        </div>

        <!-- Analysis Summary -->
        <div class="space-y-2.5 relative z-10">
          <div class="flex items-center gap-2 opacity-60">
            <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-3.5 h-3.5 text-slate-500" />
            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">AI 분석 요약</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed font-medium italic line-clamp-2 bg-slate-800/20 p-3 rounded-xl border border-white/5">
            "{{ stock.summary }}"
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
