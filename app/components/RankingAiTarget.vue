<script setup lang="ts">
const { targetedStocks, pendingTargeted, refreshTargetedStocks } = useStock()
const { getKstDate } = useKstTime()

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

// "MM.DD 추천 · D+n" 형태의 메타 뱃지 텍스트
const recBadge = (gameDate: string) => {
  if (!gameDate) return ''
  const md = gameDate.slice(5).replace('-', '.')
  const days = Math.floor((new Date(getKstDate()).getTime() - new Date(gameDate).getTime()) / (1000 * 60 * 60 * 24))
  return days <= 0 ? `${md} 추천 · 오늘` : `${md} 추천 · D+${days}`
}

// 목표 달성률(%): 추천가→목표가 구간에서 현재가의 위치. 목표가가 없거나 추천가 이하면 null
const targetProgress = (stock: any): number | null => {
  if (!stock.target_price || !stock.rec_price || stock.target_price <= stock.rec_price) return null
  return Math.round(((stock.last_price - stock.rec_price) / (stock.target_price - stock.rec_price)) * 100)
}

// 게이지/마커 표시용: 목표가 초과 시 100%, 추천가 미만 하락 시 0%로 클램프
const clampedProgress = (stock: any): number => {
  return Math.min(100, Math.max(0, targetProgress(stock) ?? 0))
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
            <div class="w-12 h-12 rounded-2xl bg-white/5"/>
            <div class="space-y-2">
              <div class="h-3 w-16 bg-white/5 rounded"/>
              <div class="h-6 w-32 bg-white/5 rounded"/>
            </div>
          </div>
          <div class="w-20 h-8 bg-white/5 rounded-xl"/>
        </div>
        <div class="h-20 w-full bg-white/5 rounded-2xl"/>
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
        class="glass-dark rounded-3xl p-6 border border-white/5 relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-white/5 hover:border-emerald-500/30"
        @click="goToStock(stock.code)"
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

        <!-- 현재가 및 추천가 대비 수익률 -->
        <div class="mb-4 relative z-10">
          <div class="flex items-center justify-between mb-2">
            <span class="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-slate-400 tracking-widest">{{ recBadge(stock.game_date) }}</span>
            <span class="text-[7px] font-black text-emerald-400 animate-pulse">LIVE</span>
          </div>
          <div class="flex items-baseline gap-2 mb-4">
            <span class="text-2xl font-black text-slate-100 tracking-tighter">{{ stock.last_price?.toLocaleString() }}원</span>
            <span
              class="text-base font-black tracking-tight"
              :class="changeTextClass(Number(calculateChangeRate(stock.rec_price, stock.last_price)) >= 0)"
            >
              {{ Number(calculateChangeRate(stock.rec_price, stock.last_price)) >= 0 ? '▲ +' : '▼ -' }}{{ Math.abs(Number(calculateChangeRate(stock.rec_price, stock.last_price))) }}%
            </span>
            <span class="text-[10px] font-bold text-slate-500">추천가 대비</span>
          </div>

          <!-- 가격 트랙: 추천가 → 현재가 → 목표가 -->
          <div v-if="targetProgress(stock) !== null">
            <div class="relative h-1.5 bg-white/10 rounded-full mx-1">
              <div
                class="absolute left-0 top-0 h-1.5 rounded-full"
                :class="Number(calculateChangeRate(stock.rec_price, stock.last_price)) >= 0 ? 'bg-rose-500/80' : 'bg-indigo-500/80'"
                :style="{ width: clampedProgress(stock) + '%' }"
              />
              <div
                class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[3px] bg-bg-deep"
                :class="Number(calculateChangeRate(stock.rec_price, stock.last_price)) >= 0 ? 'border-rose-400' : 'border-indigo-400'"
                :style="{ left: clampedProgress(stock) + '%' }"
              />
            </div>
            <div class="flex items-center justify-between mt-2.5 gap-2">
              <span class="text-[10px] font-bold text-slate-500 whitespace-nowrap">추천가 {{ stock.rec_price?.toLocaleString() }}</span>
              <span
                v-if="(targetProgress(stock) ?? 0) >= 100"
                class="text-[10px] font-black text-emerald-400 whitespace-nowrap"
              >목표 달성 · {{ targetProgress(stock) }}%</span>
              <span
                v-else
                class="text-[10px] font-bold text-slate-500 whitespace-nowrap"
              >목표 달성률 {{ clampedProgress(stock) }}%</span>
              <span class="text-[10px] font-bold text-emerald-400 whitespace-nowrap">목표가 {{ stock.target_price.toLocaleString() }}</span>
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
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
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
