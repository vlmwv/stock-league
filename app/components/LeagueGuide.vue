<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md" @click="$emit('close')"></div>
      
      <div class="relative w-full max-w-sm glass-dark rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden animate-scale-in">
        <!-- Close Button -->
        <button 
          @click="$emit('close')"
          class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 transition-all z-10"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="w-6 h-6" />
        </button>

        <div class="p-10 pt-12 text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-6">
            <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">참여 방법</span>
          </div>
          
          <h2 class="text-3xl font-black text-slate-100 mb-2 leading-tight tracking-tighter">
            주식 예측 리그에 <br/>
            <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">참여하는 방법</span>
          </h2>
          <p class="text-xs text-slate-400 font-medium mb-10 uppercase tracking-widest">수익을 위한 3가지 쉬운 단계</p>

          <!-- Guide Steps -->
          <div class="space-y-8 text-left">
            <div class="flex gap-5">
              <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center shadow-xl">
                <UIcon name="i-heroicons-chart-bar-20-solid" class="w-6 h-6 text-brand-primary" />
              </div>
              <div class="space-y-1">
                <h4 class="text-sm font-black text-slate-200 uppercase tracking-tight">1단계. 종목 확인</h4>
                <p class="text-xs text-slate-400 leading-relaxed">매일 저녁 9시 20분에 선정되는 오늘의 5가지 추천 종목과 AI 리포트를 확인하세요.</p>
              </div>
            </div>

            <div class="flex gap-5">
              <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center gap-1 shadow-xl">
                <UIcon name="i-heroicons-chevron-up" class="w-4 h-4 text-rose-500 animate-bounce-soft" />
                <UIcon name="i-heroicons-cursor-arrow-rays" class="w-5 h-5 text-indigo-400" />
                <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 text-indigo-500 animate-bounce-soft" />
              </div>
              <div class="space-y-1">
                <h4 class="text-sm font-black text-slate-200 uppercase tracking-tight">2단계. 한 장씩 스와이프</h4>
                <p class="text-xs text-slate-400 leading-relaxed">
                  오늘의 종목을 한 장씩 확인하며 <br/>
                  <span class="text-rose-400 font-bold">위로 밀면 상승</span>, <span class="text-indigo-400 font-bold">아래로 밀면 하락</span>!
                </p>
              </div>
            </div>

            <div class="flex gap-5">
              <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center shadow-xl">
                <UIcon name="i-heroicons-trophy-20-solid" class="w-6 h-6 text-brand-secondary" />
              </div>
              <div class="space-y-1">
                <h4 class="text-sm font-black text-slate-200 uppercase tracking-tight">3단계. 결과 및 랭킹</h4>
                <p class="text-xs text-slate-400 leading-relaxed">다음날 결과가 발표됩니다. 정확한 예측으로 포인트와 상위 랭킹에 도전하세요!</p>
              </div>
            </div>
          </div>

          <button 
            @click="$emit('close')"
            class="w-full mt-12 py-4 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            함께 해보기
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean
}>()

defineEmits(['close'])
</script>

<style scoped>
.animate-scale-in {
  animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.animate-bounce-soft {
  animation: bounce-soft 2s infinite ease-in-out;
}

@keyframes bounce-soft {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
