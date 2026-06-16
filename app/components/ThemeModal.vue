<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open && theme" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <!-- 배경 클릭 시 닫기 -->
        <div class="absolute inset-0" @click="$emit('update:open', false)"/>
        
        <div class="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden transform transition-all duration-300 scale-100 max-h-[85vh] flex flex-col">
          
          <!-- 상단 헤더 영역 -->
          <div class="px-6 pt-8 pb-4 border-b border-white/5 flex-shrink-0">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-white/5 tracking-wider">
                  {{ theme.stock_count }}개 관련종목
                </span>
              </div>
              <button class="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center border border-white/5" @click="$emit('update:open', false)">
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
              </button>
            </div>

            <!-- 테마명 및 등락률 -->
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight truncate flex-1">
                {{ theme.sector }}
              </h3>
              <div 
                class="px-3.5 py-1.5 rounded-full text-xs font-black tracking-tight flex items-center gap-1 shrink-0"
                :class="theme.avg_change_rate >= 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'"
              >
                <UIcon :name="theme.avg_change_rate >= 0 ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" class="w-3.5 h-3.5" />
                {{ theme.avg_change_rate >= 0 ? '+' : '' }}{{ theme.avg_change_rate }}%
              </div>
            </div>
          </div>

          <!-- 본문 종목 목록 (스크롤) -->
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3 no-scrollbar">
            <div 
              v-for="(stock, index) in theme.stocks" 
              :key="stock.id"
              class="glass-dark rounded-2xl p-4 border border-white/5 flex items-center gap-3.5 hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer group"
              @click="handleStockClick(stock.code)"
            >
              <!-- 테마 내 순위 번호 -->
              <span class="text-[10px] font-black text-slate-500 w-5 text-center shrink-0">{{ index + 1 }}</span>
              <!-- 종목 아이콘 -->
              <StockIcon :code="stock.code" :name="stock.name" size="md" class="group-hover:scale-105 transition-transform duration-300" />
              
              <!-- 종목 기본 정보 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-1">
                  <h4 class="font-bold text-slate-200 truncate text-sm group-hover:text-brand-primary transition-colors">{{ stock.name }}</h4>
                  <span class="text-[9px] font-mono text-slate-500 uppercase tracking-tighter shrink-0">{{ stock.code }}</span>
                </div>
                <div class="text-[10px] text-slate-500 font-medium">현재가 {{ (stock.last_price || 0).toLocaleString() }}원</div>
              </div>

              <!-- 우측 등락률 표시 -->
              <div class="text-right shrink-0">
                <div 
                  class="text-xs font-black tracking-tight flex items-center gap-0.5 justify-end"
                  :class="stock.change_rate >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                >
                  <span class="text-[10px]">{{ stock.change_rate >= 0 ? '▲' : '▼' }}</span>
                  {{ Math.abs(stock.change_amount).toLocaleString() }}
                </div>
                <div 
                  class="text-[9px] font-bold mt-0.5 opacity-80"
                  :class="stock.change_rate >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                >
                  {{ stock.change_rate >= 0 ? '+' : '' }}{{ stock.change_rate }}%
                </div>
              </div>
            </div>
          </div>

          <!-- 하단 안내 영역 -->
          <div class="px-6 py-6 border-t border-white/5 flex-shrink-0 bg-slate-900/50">
            <button 
              class="w-full h-14 rounded-2xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 active:scale-95 transition-all text-sm uppercase tracking-widest border border-white/5"
              @click="$emit('update:open', false)"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  theme: {
    sector: string
    stock_count: number
    avg_change_rate: number
    stocks: Array<{
      id: number
      name: string
      code: string
      last_price: number
      change_amount: number
      change_rate: number
      market_cap_rank?: number
    }>
  } | null
}>()

const emit = defineEmits(['update:open'])
const router = useRouter()

const handleStockClick = (code: string) => {
  emit('update:open', false)
  if (code) {
    router.push('/stocks/' + code)
  }
}
</script>

<style scoped>
.glass-dark {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-active .relative, .fade-leave-active .relative {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-enter-from .relative, .fade-leave-to .relative {
  transform: scale(0.95);
}
</style>
