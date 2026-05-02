<template>
  <div class="group relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md p-5 transition-all duration-300 hover:border-brand-primary/30 hover:bg-slate-900/60 shadow-lg">
    <!-- 데코레이션 배경 -->
    <div class="absolute -right-4 -top-10 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl group-hover:bg-brand-primary/10 transition-all duration-500"></div>
    
    <div class="flex items-start justify-between mb-4 relative z-10">
      <div class="flex items-center gap-3">
        <!-- 국가 아이콘/플래그 -->
        <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-inner">
          <span v-if="item.country === 'US'">🇺🇸</span>
          <span v-else-if="item.country === 'KR'">🇰🇷</span>
          <span v-else>🌐</span>
        </div>
        
        <div>
          <h3 class="text-sm font-bold text-slate-100 group-hover:text-brand-primary transition-colors line-clamp-1">
            {{ item.event_name }}
          </h3>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {{ formatDateTime(item.event_at) }}
            </span>
            <div class="flex gap-0.5">
              <div 
                v-for="i in 3" 
                :key="i"
                class="w-1 h-3 rounded-full"
                :class="i <= (item.importance || 1) ? getImportanceColor(item.importance) : 'bg-slate-800'"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="item.impact" class="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight" :class="getImpactStyle(item.impact)">
        {{ item.impact === 'positive' ? '호재' : item.impact === 'negative' ? '악재' : '중립' }}
      </div>
    </div>

    <!-- 수치 정보 레이아웃 -->
    <div class="grid grid-cols-3 gap-2 relative z-10">
      <div class="flex flex-col items-center p-2 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">실제</span>
        <span class="text-xs font-black" :class="item.actual ? 'text-slate-100' : 'text-slate-600'">
          {{ item.actual || (!item.forecast && !item.previous ? '-' : '발표전') }}
        </span>
      </div>
      
      <div class="flex flex-col items-center p-2 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">예측</span>
        <span class="text-xs font-bold text-slate-300">
          {{ item.forecast || '-' }}
        </span>
      </div>
      
      <div class="flex flex-col items-center p-2 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">이전</span>
        <span class="text-xs font-bold text-slate-400">
          {{ item.previous || '-' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  item: {
    event_name: string
    event_at: string
    country: string
    importance: number
    actual?: string
    forecast?: string
    previous?: string
    unit?: string
    impact?: 'positive' | 'negative' | 'neutral'
  }
}>()

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const getImportanceColor = (importance: number) => {
  if (importance >= 3) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
  if (importance >= 2) return 'bg-amber-500'
  return 'bg-slate-500'
}

const getImpactStyle = (impact: string) => {
  if (impact === 'positive') return 'bg-rose-500/10 text-rose-500'
  if (impact === 'negative') return 'bg-blue-500/10 text-blue-500'
  return 'bg-slate-500/10 text-slate-500'
}
</script>
