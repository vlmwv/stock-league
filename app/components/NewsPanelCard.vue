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

      <h4 class="font-bold text-slate-100 text-[15px] leading-snug group-hover:text-brand-primary transition-colors line-clamp-2 tracking-tight">
        {{ item.title }}
      </h4>

      <div v-if="item.llm_summary" class="bg-indigo-500/[0.04] rounded-2xl p-3.5 border border-white/5 transition-colors group-hover:border-brand-primary/20">
        <div class="flex items-center gap-2 mb-1.5">
          <span
            v-if="item.ai_score"
            class="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md border shadow-sm"
            :class="[
              item.ai_score > 55 ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' :
              item.ai_score < 45 ? 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' :
              'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            ]"
          >
            {{ item.ai_score }}점
          </span>
          <span class="text-brand-primary text-[10px] font-black opacity-80 uppercase tracking-wider">AI INSIGHT</span>
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed font-medium">
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
