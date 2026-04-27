<template>
  <div
    @click="$emit('navigate-news')"
    class="bg-white/[0.03] rounded-[1.5rem] p-5 border border-white/5 group hover:bg-white/[0.07] transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
  >
    <div class="flex flex-col gap-4 relative z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div v-if="item.stockName" class="flex flex-col gap-0.5">
            <span class="text-[13px] font-black text-slate-200 tracking-tight leading-none">{{ item.stockName }}</span>
            <span class="text-[9px] font-bold text-slate-500 font-mono tracking-tighter">{{ item.stockCode }}</span>
          </div>
          <span v-else class="text-[11px] text-slate-400 font-black uppercase tracking-widest">{{ item.source }}</span>
        </div>

        <div class="flex items-center gap-4">
          <button
            v-if="item.stockId"
            @click.stop="$emit('openWishlistModal', item.stockId)"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-90 border border-white/5"
            :class="isHearted ? 'text-rose-500 border-rose-500/20' : 'text-slate-600'"
          >
            <UIcon :name="isHearted ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-4.5 h-4.5" />
          </button>
          <button
            v-if="item.stockCode"
            @click.stop="$emit('navigate-stock', item.stockCode)"
            class="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-slate-900 transition-all shadow-lg group/plus"
          >
            <UIcon name="i-heroicons-plus-20-solid" class="w-5 h-5 transition-transform group-hover/plus:rotate-90" />
          </button>
          <span class="text-[10px] text-slate-500 font-bold opacity-60">{{ formattedDate }}</span>
        </div>
      </div>

      <!-- 뉴스 제목 (파도타기 효과 패널) -->
      <div class="relative overflow-hidden bg-slate-900/50 rounded-xl h-11 flex items-center border border-white/5 group/marquee px-4 shadow-inner">
        <div class="flex items-center gap-2 mr-3 shrink-0 opacity-40">
          <UIcon name="i-heroicons-newspaper" class="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div class="flex-1 overflow-hidden relative">
          <div class="flex whitespace-nowrap animate-marquee-slow group-hover/marquee:animate-marquee-paused transition-all">
            <h4 class="font-bold text-slate-100 text-[14px] tracking-tight flex items-center h-full">
              {{ item.title }} &nbsp;&nbsp;&middot;&nbsp;&nbsp; {{ item.title }}
            </h4>
          </div>
        </div>
      </div>

      <!-- AI 요약 (기존 Context 패널 스타일) -->
      <div v-if="item.llm_summary" class="relative bg-brand-primary/5 rounded-xl p-4 border border-brand-primary/10 group-hover:bg-brand-primary/10 transition-all">
        <div class="flex items-center gap-1.5 mb-2 opacity-60">
          <UIcon name="i-heroicons-sparkles" class="w-3 h-3 text-brand-primary" />
          <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest">AI SUMMARY</span>
        </div>
        <p class="text-[12px] text-slate-300 leading-relaxed font-medium">
          {{ item.llm_summary }}
        </p>
      </div>
    </div>

    <div class="absolute -bottom-12 -right-12 w-28 h-28 bg-brand-secondary/5 blur-[50px] rounded-full group-hover:bg-brand-secondary/10 transition-all duration-700"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  item: any
  isHearted: boolean
  formattedDate: string
}>()

defineEmits<{
  (e: 'navigate-news'): void
  (e: 'openWishlistModal', stockId: number): void
  (e: 'navigate-stock', stockCode: string): void
}>()
</script>

<style scoped>
@keyframes marquee-slow {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee-slow {
  animation: marquee-slow 15s linear infinite;
}
.animate-marquee-paused {
  animation-play-state: paused;
}
</style>
