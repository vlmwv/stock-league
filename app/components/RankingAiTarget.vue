<script setup lang="ts">
const { targetedStocks, pendingTargeted, refreshTargetedStocks } = useStock()

const calculateUpside = (current: number, target: number) => {
  if (!current || !target) return '0'
  const upside = ((target - current) / current) * 100
  return upside.toFixed(1)
}

onMounted(() => {
  refreshTargetedStocks()
})
</script>

<template>
  <div class="animate-fade-in">
    <div class="mb-8">
      <h3 class="text-xl font-black text-slate-100 tracking-tight">AI 선정 목표가</h3>
      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">AI Predicted Target Prices</p>
    </div>

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
        @click="navigateTo('/stocks/' + stock.code)"
        class="glass-dark rounded-3xl p-6 border border-white/5 relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-white/5 hover:border-emerald-500/30"
      >
        <!-- Header: Stock Info -->
        <div class="flex justify-between items-start mb-6 relative z-10">
          <div class="flex gap-4">
            <StockIcon :code="stock.code" :name="stock.name" size="md" />
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">{{ stock.code }}</span>
                <span class="text-[8px] font-black text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest">{{ stock.game_date }} 추천</span>
              </div>
              <h4 class="text-lg font-black text-slate-100 group-hover:text-emerald-400 transition-colors">{{ stock.name }}</h4>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs font-black text-slate-400">{{ stock.last_price.toLocaleString() }}원</div>
            <div 
              class="text-[9px] font-bold"
              :class="stock.change_rate >= 0 ? 'text-rose-400' : 'text-indigo-400'"
            >
              {{ stock.change_rate >= 0 ? '+' : '' }}{{ stock.change_rate }}%
            </div>
          </div>
        </div>

        <!-- Target Price Highlight Box -->
        <div class="relative bg-emerald-500/5 rounded-2xl border border-emerald-500/10 p-5 mb-6 overflow-hidden">
          <div class="absolute top-0 right-0 p-4 opacity-10">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-16 h-16 text-emerald-400" />
          </div>
          
          <div class="grid grid-cols-2 gap-4 relative z-10">
            <div>
              <p class="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">AI 목표가</p>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black text-emerald-400">{{ stock.target_price.toLocaleString() }}</span>
                <span class="text-xs font-bold text-emerald-500/70">원</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">목표기준일</p>
              <p class="text-sm font-black text-slate-200">{{ stock.target_date }}</p>
            </div>
          </div>

          <!-- Potential Upside -->
          <div class="mt-4 pt-4 border-t border-emerald-500/10 flex items-center justify-between">
            <span class="text-[9px] font-bold text-slate-500">예상 수익률</span>
            <span class="text-xs font-black text-emerald-400">+{{ calculateUpside(stock.last_price, stock.target_price) }}%</span>
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
