<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" @click="$emit('close')"></div>
      
      <div class="relative w-full max-w-sm glass-dark rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden animate-scale-in">
        <!-- Close Button -->
        <button 
          @click="$emit('close')"
          class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 transition-all z-10 border border-white/5"
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
          <p class="text-[10px] text-slate-400 font-bold mb-10 uppercase tracking-[0.2em]">3 EASY STEPS TO WIN</p>

          <!-- Guide Steps -->
          <div class="space-y-10 text-left">
            <div class="flex gap-5 group">
              <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                <UIcon name="i-heroicons-sparkles-20-solid" class="w-6 h-6 text-brand-primary animate-pulse-soft" />
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-black text-slate-200 uppercase tracking-tight">1단계. 매일 밤 9시 20분</h4>
                  <span class="px-1.5 py-0.5 rounded-sm bg-brand-primary/20 text-[8px] font-black text-brand-primary uppercase">Daily Open</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">엄선된 <span class="text-slate-200 font-bold">5가지 추천 종목</span>과 <span class="text-slate-200 font-bold">AI 인사이트 리포트</span>를 확인하세요.</p>
              </div>
            </div>

            <div class="flex gap-5 group">
              <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/10 to-indigo-500/10 border border-white/10 flex flex-col items-center justify-center gap-0.5 shadow-xl group-hover:scale-110 transition-transform duration-500">
                <div class="flex gap-1">
                  <div class="w-3 h-3 rounded-sm bg-rose-500/80 animate-bounce-soft"></div>
                  <div class="w-3 h-3 rounded-sm bg-indigo-500/80 animate-bounce-soft-delayed"></div>
                </div>
              </div>
              <div class="space-y-1">
                <h4 class="text-xs font-black text-slate-200 uppercase tracking-tight">2단계. 상승 또는 하락 선택</h4>
                <p class="text-xs text-slate-400 leading-relaxed">
                  내일 장의 흐름을 예측하여 <br/>
                  <span class="text-rose-400 font-black">상승</span> 또는 <span class="text-indigo-400 font-black">하락</span> 버튼을 탭하세요!
                </p>
              </div>
            </div>

            <div class="flex gap-5 group">
              <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-secondary/10 to-indigo-500/10 border border-brand-secondary/20 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                <UIcon name="i-heroicons-trophy-20-solid" class="w-6 h-6 text-brand-secondary" />
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-black text-slate-200 uppercase tracking-tight">3단계. 결과 확인 및 랭킹</h4>
                  <span class="px-1.5 py-0.5 rounded-sm bg-brand-secondary/20 text-[8px] font-black text-brand-secondary uppercase">Result at 20:30</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">정확한 예측으로 포인트를 획득하고 <span class="text-slate-200 font-bold">주간/월간 랭킹 상위권</span>에 도전하세요!</p>
              </div>
            </div>
          </div>

          <button 
            @click="$emit('close')"
            class="w-full mt-12 py-4.5 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-slate-900 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group/btn"
          >
            <span class="relative z-10">참여하러 가기</span>
            <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
          </button>
          
          <p class="mt-4 text-[9px] text-slate-600 font-bold uppercase tracking-widest opacity-60">
            Participation closes at 08:00 AM daily
          </p>
        </div>
        
        <!-- Decorative Glows -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-secondary/10 blur-[80px] rounded-full pointer-events-none"></div>
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
  animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.animate-pulse-soft {
  animation: pulse-soft 2s infinite ease-in-out;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
}

.animate-bounce-soft {
  animation: bounce-soft 2s infinite ease-in-out;
}

.animate-bounce-soft-delayed {
  animation: bounce-soft 2s infinite ease-in-out 1s;
}

@keyframes bounce-soft {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.glass-dark {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
</style>
