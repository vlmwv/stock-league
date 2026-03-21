<template>
  <Transition name="scale">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <div 
        ref="dialogRef"
        class="relative w-full max-w-sm glass-dark rounded-[3rem] p-10 overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]"
      >
        <!-- Decorative bg -->
        <div class="absolute -top-20 -right-20 w-64 h-64 bg-brand-primary/20 blur-[80px] rounded-full"></div>
        <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-secondary/20 blur-[80px] rounded-full"></div>

        <div class="relative z-10 flex flex-col items-center text-center">
          <div class="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-2xl mb-8 animate-bounce-slow">
            <UIcon name="i-heroicons-check-badge-20-solid" class="w-12 h-12 text-white" />
          </div>

          <h3 class="text-3xl font-black text-slate-100 mb-3 tracking-tight">예측 완료!</h3>
          <p class="text-slate-400 font-medium leading-relaxed mb-10">
            <span class="text-brand-primary font-bold">{{ stockName }}</span> 종목의 {{ prediction === 'up' ? '상승' : '하락' }} 예측이 성공적으로 접수되었습니다.
          </p>

          <button 
            @click="close"
            class="w-full py-5 rounded-[2rem] bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black uppercase tracking-widest shadow-xl shadow-brand-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import confetti from 'canvas-confetti'

const props = defineProps<{
  isOpen: boolean
  stockName: string
  prediction: 'up' | 'down' | null
}>()

const emit = defineEmits(['close'])
const dialogRef = ref(null)

const close = () => {
  emit('close')
}

onClickOutside(dialogRef, () => {
  if (props.isOpen) close()
})

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#3b82f6']
    })
  }
})
</script>

<style scoped>
.scale-enter-active, .scale-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-bounce-slow {
  animation: bounce-slow 3s ease-in-out infinite;
}
</style>
