<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div class="absolute inset-0" @click="$emit('close')"/>
      
      <div class="relative w-full max-w-md glass-dark rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden animate-scale-in my-auto">
        <!-- Close Button -->
        <button 
          class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 transition-all z-10 border border-white/5"
          @click="$emit('close')"
        >
          <UIcon name="i-heroicons-x-mark-20-solid" class="w-6 h-6" />
        </button>

        <div class="p-8 pt-10 text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-5">
            <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Quick Map</span>
          </div>
          
          <h2 class="text-2xl sm:text-3xl font-black text-slate-100 mb-2 leading-tight tracking-tighter">
            니나노AI <br>
            <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">한눈에 둘러보기</span>
          </h2>
          <p class="text-[10px] text-slate-400 font-bold mb-8 uppercase tracking-[0.2em]">EXPLORE ALL FEATURES IN A GLANCE</p>

          <!-- Guide Cards -->
          <div class="space-y-4 text-left">
            <!-- 1. Home & My -->
            <div class="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <UIcon name="i-heroicons-home-20-solid" class="w-5 h-5 text-indigo-400" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-black text-slate-200">나만의 투자 요약판</h4>
                  <span class="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-[9px] font-bold text-indigo-400 border border-indigo-500/20 uppercase">Home & My</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">내 예측 성공률과 자산 흐름, 위시리스트를 한곳에서 쉽게 확인하세요.</p>
              </div>
            </div>

            <!-- 2. Stocks & Info -->
            <div class="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <UIcon name="i-heroicons-chart-bar-20-solid" class="w-5 h-5 text-emerald-400" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-black text-slate-200">스마트한 시장 분석</h4>
                  <span class="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20 uppercase">Stocks & Info</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">AI 추천 점수와 놓치면 안 될 글로벌 경제 지표를 실시간으로 모니터링하세요.</p>
              </div>
            </div>

            <!-- 3. Play & Game -->
            <div class="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-rose-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <UIcon name="i-heroicons-puzzle-piece-20-solid" class="w-5 h-5 text-rose-400" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-black text-slate-200">투자 감각 극대화</h4>
                  <span class="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-[9px] font-bold text-rose-400 border border-rose-500/20 uppercase">Play & Game</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">매일의 일일 예측 리그와 역사적 금융위기를 극복해보는 서바이벌 게임에 참여하세요.</p>
              </div>
            </div>

            <!-- 4. AI Insight -->
            <div class="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <UIcon name="i-heroicons-sparkles-20-solid" class="w-5 h-5 text-purple-400" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-black text-slate-200">인텔리전트 리포트</h4>
                  <span class="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-[9px] font-bold text-purple-400 border border-purple-500/20 uppercase">AI Insight</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">AI의 정교한 종목 분석 리포트와 예측 기록실로 성공적인 투자 결정을 돕습니다.</p>
              </div>
            </div>
          </div>

          <button 
            class="w-full mt-8 py-4.5 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-slate-900 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group/btn"
            @click="$emit('close')"
          >
            <span class="relative z-10">니나노AI 시작하기</span>
            <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"/>
          </button>
          
          <p class="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-80">
            즐겁고 유익한 투자 여정을 경험해보세요.
          </p>
        </div>
        
        <!-- Decorative Glows -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 blur-[80px] rounded-full pointer-events-none"/>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-secondary/10 blur-[80px] rounded-full pointer-events-none"/>
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
