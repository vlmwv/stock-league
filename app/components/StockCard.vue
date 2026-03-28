<template>
  <div 
    ref="cardRef"
    class="relative group cursor-grab active:cursor-grabbing transition-transform duration-500 ease-out"
    :style="cardStyle"
  >
    <!-- Background Glow -->
    <div class="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    
    <div class="relative glass-dark rounded-[2.5rem] p-7 shadow-2xl overflow-hidden border border-white/5 group-hover:border-white/10 transition-colors">
      <div 
        class="absolute inset-x-0 top-0 h-1/2 transition-all duration-300 opacity-0 hover:opacity-100 z-30 cursor-pointer group/up"
        @click.stop="onMaskClick('up')"
      >
        <div 
          class="absolute inset-x-0 top-0 h-2 bg-rose-500 blur-md scale-x-50 group-hover/up:scale-x-100 transition-transform duration-500"
          :class="{ 'opacity-100 blur-lg': swipeEffect === 'up' }"
        ></div>
        <div class="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-0 group-hover/up:opacity-100 transition-opacity duration-300">
          <UIcon name="i-heroicons-arrow-trending-up-20-solid" class="w-6 h-6 text-rose-500 animate-bounce" />
          <span class="text-[10px] font-black text-rose-500 uppercase tracking-widest">상승 예측</span>
        </div>
      </div>
      <div 
        class="absolute inset-x-0 bottom-0 h-1/2 transition-all duration-300 opacity-0 hover:opacity-100 z-30 cursor-pointer group/down"
        @click.stop="onMaskClick('down')"
      >
        <div 
          class="absolute inset-x-0 bottom-0 h-2 bg-indigo-500 blur-md scale-x-50 group-hover/down:scale-x-100 transition-transform duration-500"
          :class="{ 'opacity-100 blur-lg': swipeEffect === 'down' }"
        ></div>
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-0 group-hover/down:opacity-100 transition-opacity duration-300">
          <span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">하락 예측</span>
          <UIcon name="i-heroicons-arrow-trending-down-20-solid" class="w-6 h-6 text-indigo-400 animate-bounce" />
        </div>
      </div>

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
          <h4 class="text-xl font-black text-slate-100 tracking-tight leading-none truncate">{{ stock.name }}</h4>
        </div>

        <div class="text-right shrink-0">
          <div class="text-xl font-black text-slate-100 tabular-nums">
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
          <template v-if="isLeagueOpen">
            <div class="flex flex-col items-center gap-1">
              <UIcon name="i-heroicons-chevron-up" class="w-3 h-3 text-rose-500 animate-bounce" />
              <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest text-rose-500/80">상승</span>
            </div>
            <div class="h-px w-8 bg-slate-800"></div>
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">스와이프해서 예측</p>
            <div class="h-px w-8 bg-slate-800"></div>
            <div class="flex flex-col items-center gap-1">
              <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest text-indigo-500/80">하락</span>
              <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 text-indigo-500 animate-bounce" />
            </div>
          </template>
          <template v-else>
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest italic opacity-60">오늘의 예측이 마감되었습니다</p>
          </template>
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
            v-if="isLeagueOpen"
            @click.stop="$emit('cancelPrediction', stock.id)"
            class="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors py-2 px-4 rounded-full border border-slate-700/50"
          >
            취소하기
          </button>
          <p v-else class="mt-6 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            마감되었습니다
          </p>
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
  isLeagueOpen: boolean
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
        if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen) return
        
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
        if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen) return

        const threshold = 120 // Distance needed to trigger prediction
        
        if (translateY.value < -threshold) {
          triggerPrediction('up')
        } else if (translateY.value > threshold) {
          triggerPrediction('down')
        } else {
          // Snap back if not far enough
          translateY.value = 0
          rotation.value = 0
        }
        
        swipeEffect.value = null
      }
    })
  }

  // Keyboard support for the top card
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen) return
    
    if (e.key === 'ArrowUp') {
      triggerPrediction('up')
    } else if (e.key === 'ArrowDown') {
      triggerPrediction('down')
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

const onMaskClick = (type: 'up' | 'down') => {
  if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen) return
  triggerPrediction(type)
}

const triggerPrediction = (type: 'up' | 'down') => {
  isFlying.value = true
  if (type === 'up') {
    // Intuitive Up: Shoot up with a slight bounce
    translateY.value = -1200
    rotation.value = -10
  } else {
    // Intuitive Down: Sink down
    translateY.value = 1200
    rotation.value = 10
  }
  emit('predict', props.stock.id, type)
}
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
