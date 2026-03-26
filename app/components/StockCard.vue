<template>
  <div 
    ref="cardRef"
    class="relative group cursor-grab active:cursor-grabbing transition-transform duration-500 ease-out"
    :style="cardStyle"
  >
    <!-- Background Glow -->
    <div class="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    
    <div class="relative glass-dark rounded-[2.5rem] p-7 shadow-2xl overflow-hidden border border-white/5 group-hover:border-white/10 transition-colors">
      <!-- Flick Indicators (Animated) -->
      <div 
        class="absolute inset-x-0 top-0 h-2 transition-all duration-300 opacity-0 group-hover:opacity-100 z-30"
        :class="[swipeEffect === 'up' ? 'bg-rose-500 blur-md scale-x-100' : 'bg-rose-500/20 scale-x-50']"
      ></div>
      <div 
        class="absolute inset-x-0 bottom-0 h-2 transition-all duration-300 opacity-0 group-hover:opacity-100 z-30"
        :class="[swipeEffect === 'down' ? 'bg-indigo-500 blur-md scale-x-100' : 'bg-indigo-500/20 scale-x-50']"
      ></div>

      <div class="flex justify-between items-start mb-6">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700/50 uppercase tracking-tighter">
              {{ stock.code }}
            </span>
            <button 
              @click.stop="$emit('toggleHeart', stock.id)" 
              class="w-8 h-8 flex items-center justify-center rounded-full transition-all"
              :class="[isHearted ? 'bg-rose-500/10 text-rose-500 shadow-lg shadow-rose-500/20 bg-clip-text' : 'text-slate-600 hover:text-slate-400']"
            >
              <UIcon :name="isHearted ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
            </button>
          </div>
          <h4 class="text-2xl font-black text-slate-100 tracking-tight leading-none">{{ stock.name }}</h4>
        </div>

        <div class="text-right">
          <div class="text-2xl font-black text-slate-100 tabular-nums">
            {{ stock.last_price.toLocaleString() }}
          </div>
          <div 
            class="text-xs font-bold flex items-center justify-end gap-1 mt-1 transition-colors"
            :class="[stock.change_amount > 0 ? 'text-rose-400' : stock.change_amount < 0 ? 'text-indigo-400' : 'text-slate-500']"
          >
            <span v-if="stock.change_amount > 0">▲</span>
            <span v-else-if="stock.change_amount < 0">▼</span>
            <span>{{ Math.abs(stock.change_amount).toLocaleString() }} ({{ stock.change_rate }}%)</span>
          </div>
        </div>
      </div>

      <!-- LLM Summary Section (Premium Design) -->
      <div class="relative bg-slate-900/40 rounded-[1.5rem] p-5 border border-white/5 group-hover:bg-slate-900/60 transition-all">
        <div class="absolute top-3 left-3 opacity-10">
          <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-8 h-8 text-indigo-400" />
        </div>
        <p class="text-sm text-slate-400 leading-relaxed font-medium line-clamp-3 relative z-10 italic">
          "{{ stock.summary }}"
        </p>
      </div>

      <!-- Swipe Suggestion (New) -->
      <Transition name="fade">
        <div v-if="!prediction" class="mt-6 flex items-center justify-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
          <div class="flex flex-col items-center gap-1">
            <UIcon name="i-heroicons-chevron-up" class="w-3 h-3 text-rose-500 animate-bounce" />
            <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest text-rose-500/80">UP</span>
          </div>
          <div class="h-px w-8 bg-slate-800"></div>
          <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Swipe to Predict</p>
          <div class="h-px w-8 bg-slate-800"></div>
          <div class="flex flex-col items-center gap-1">
            <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest text-indigo-500/80">DOWN</span>
            <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 text-indigo-500 animate-bounce" />
          </div>
        </div>
      </Transition>

      <!-- Prediction Overlay -->
      <Transition name="fade">
        <div 
          v-if="prediction" 
          class="absolute inset-0 flex flex-col items-center justify-center glass backdrop-blur-sm z-20 border-2"
          :class="[prediction === 'up' ? 'border-rose-500/40' : 'border-indigo-500/40']"
        >
          <div 
            class="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl mb-4"
            :class="[prediction === 'up' ? 'bg-rose-500 shadow-rose-500/30' : 'bg-indigo-500 shadow-indigo-500/30']"
          >
            <UIcon :name="prediction === 'up' ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" class="w-8 h-8 text-white" />
          </div>
          <span 
            class="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b"
            :class="[prediction === 'up' ? 'from-rose-400 to-rose-600' : 'from-indigo-400 to-indigo-600']"
          >
            {{ prediction === 'up' ? '상승 예측 ↑' : '하락 예측 ↓' }}
          </span>
          <button 
            @click.stop="$emit('cancelPrediction', stock.id)"
            class="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors py-2 px-4 rounded-full border border-slate-700/50"
          >
            취소하기
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  stock: any
  isHearted: boolean
  prediction: 'up' | 'down' | null
  isTop?: boolean
  index?: number
}>()

const emit = defineEmits(['predict', 'toggleHeart', 'cancelPrediction'])

const cardRef = ref<HTMLElement | null>(null)
const swipeEffect = ref<'up' | 'down' | null>(null)
const translateY = ref(0)
const rotation = ref(0)
const isFlying = ref(false)

const cardStyle = computed(() => ({
  transform: `translateY(${translateY.value}px) rotate(${rotation.value}deg)`,
  opacity: isFlying.value ? 0 : 1 - (Math.abs(translateY.value) / 500),
  transition: isFlying.value ? 'all 0.6s cubic-bezier(0.2, 0, 0.2, 1)' : (translateY.value === 0 ? 'all 0.5s ease-out' : 'none'),
  pointerEvents: (props.isTop ? 'auto' : 'none') as 'auto' | 'none',
  zIndex: 100 - (props.index || 0)
}))

onMounted(() => {
  if (cardRef.value) {
    const { direction, isSwiping, lengthY } = useSwipe(cardRef, {
      threshold: 30, // Reduced threshold for better responsiveness
      onSwipe: () => {
        if (!props.isTop || props.prediction || isFlying.value) return
        
        // Follow finger with slight resistance
        translateY.value = lengthY.value * 0.8
        rotation.value = (lengthY.value / 100) * 5
        
        if (lengthY.value < -20) {
          swipeEffect.value = 'up'
        } else if (lengthY.value > 20) {
          swipeEffect.value = 'down'
        } else {
          swipeEffect.value = null
        }
      },
      onSwipeEnd: (e, direction) => {
        if (!props.isTop || props.prediction || isFlying.value) return

        const threshold = 120 // Distance needed to trigger prediction
        
        if (translateY.value < -threshold) {
          // Swipe UP -> UP Prediction
          isFlying.value = true
          translateY.value = -1000
          rotation.value = -45
          emit('predict', props.stock.id, 'up')
        } else if (translateY.value > threshold) {
          // Swipe DOWN -> DOWN Prediction
          isFlying.value = true
          translateY.value = 1000
          rotation.value = 45
          emit('predict', props.stock.id, 'down')
        } else {
          // Snap back if not far enough
          translateY.value = 0
          rotation.value = 0
        }
        
        swipeEffect.value = null
      }
    })
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
