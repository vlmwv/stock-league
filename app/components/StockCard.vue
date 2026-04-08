<template>
  <div 
    ref="cardRef"
    class="relative group transition-transform duration-500 ease-out"
    :class="{ 'cursor-grab active:cursor-grabbing': isPredictable && isLeagueOpen }"
    :style="cardStyle"
  >
    <!-- Background Glow -->
    <div class="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    
    <div class="relative glass-dark rounded-[2.5rem] p-7 shadow-2xl overflow-hidden border border-white/5 group-hover:border-white/10 transition-colors">
      <!-- Swipe/Click Masks (Only shown if predictable and league open) -->
      <template v-if="isPredictable && isLeagueOpen">
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
      </template>

      <div class="flex justify-between items-start mb-6">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700/50 uppercase tracking-tighter">
              {{ stock.code }}
            </span>
            <NuxtLink
              :to="'/stocks/' + stock.id"
              class="px-2 py-1.5 rounded-lg bg-slate-800 text-[9px] font-black text-slate-400 hover:text-slate-100 transition-colors border border-slate-700/50 uppercase tracking-widest"
            >
              상세
            </NuxtLink>
            <button 
              @click.stop="$emit('toggleHeart', stock.id)" 
              class="w-8 h-8 flex items-center justify-center rounded-full transition-all"
              :class="[isHearted ? 'bg-rose-500/10 text-rose-500 shadow-lg shadow-rose-500/20 bg-clip-text' : 'text-slate-600 hover:text-slate-400']"
            >
              <UIcon :name="isHearted ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
            </button>
          </div>
          <h4 class="text-xl font-black text-slate-100 tracking-tight leading-none truncate">{{ stock.name }}</h4>
          <div v-if="stock.ai_recommendation_count > 0" class="flex items-center gap-2 mt-1.5">
            <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
              <UIcon name="i-heroicons-sparkles-20-solid" class="w-3 h-3 text-orange-400" />
              <span class="text-[9px] font-black text-orange-400">AI 추천 {{ stock.ai_recommendation_count }}회</span>
            </div>
          </div>
        </div>

        <div class="text-right shrink-0 transition-all duration-300" :class="prediction ? 'mt-16' : ''">
          <div class="flex items-baseline justify-end gap-0.5">
            <span class="text-2xl font-black text-slate-100 tabular-nums tracking-tighter">{{ stock.last_price.toLocaleString() }}</span>
            <span class="text-[10px] font-bold text-slate-400">원</span>
          </div>
          <div 
            class="text-xs font-black flex items-center justify-end gap-1 mt-0.5 transition-colors"
            :class="[stock.change_amount > 0 ? 'text-rose-400' : stock.change_amount < 0 ? 'text-indigo-400' : 'text-slate-500']"
          >
            <span v-if="stock.change_amount > 0" class="text-[10px]">▲</span>
            <span v-else-if="stock.change_amount < 0" class="text-[10px]">▼</span>
            <span>{{ Math.abs(stock.change_amount).toLocaleString() }}</span>
            <span class="opacity-60 text-[10px]">({{ stock.change_rate }}%)</span>
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
            <template v-if="isPredictable">
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
            <p v-else class="text-[9px] font-black text-slate-600 uppercase tracking-widest italic opacity-60">
              오늘의 리그 종목이 아닙니다
            </p>
          </template>
          <template v-else>
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest italic opacity-60">오늘의 예측이 마감되었습니다</p>
          </template>
        </div>
      </Transition>

      <!-- Prediction Overlay (Refined) -->
      <Transition name="fade">
        <div 
          v-if="prediction" 
          class="absolute inset-0 z-[40] pointer-events-none"
        >
          <!-- Border Highlight -->
          <div 
            class="absolute inset-0 border-2 rounded-[2.5rem]"
            :class="[prediction === 'up' ? 'border-rose-500/30' : 'border-indigo-500/30']"
          ></div>
          
          <!-- Animated Badge -->
          <div class="absolute top-6 right-6 flex flex-col items-end gap-1.5 pointer-events-auto">
            <div 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border animate-bounce-soft"
              :class="[prediction === 'up' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400']"
            >
              <UIcon :name="prediction === 'up' ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" class="w-4 h-4" />
              <span class="text-[10px] font-black uppercase tracking-widest">
                {{ prediction === 'up' ? '상승 예측' : '하락 예측' }}
              </span>
            </div>
            
            <button 
              v-if="isLeagueOpen"
              @click.stop="$emit('cancelPrediction', stock.id)"
              class="px-2 py-1 rounded-lg bg-slate-900/80 border border-white/5 text-[8px] font-black text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-all uppercase tracking-widest backdrop-blur-sm"
            >
              취소하기
            </button>
            <span v-else class="text-[8px] font-bold text-slate-600 uppercase tracking-widest px-2 opacity-60">
              마감됨
            </span>
          </div>

          <!-- Subtle Indicator Icon in corner -->
          <div class="absolute bottom-6 right-8 opacity-10">
            <UIcon 
              :name="prediction === 'up' ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" 
              class="w-24 h-24" 
              :class="prediction === 'up' ? 'text-rose-500' : 'text-indigo-500'"
            />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  stock: any
  isHearted: boolean
  prediction: 'up' | 'down' | null
  isLeagueOpen: boolean
  isPredictable?: boolean
  isTop?: boolean
  index?: number
}>(), {
  isPredictable: true,
  isTop: false,
  index: 0
})

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
        if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen || !props.isPredictable) return
        
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
        if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen || !props.isPredictable) return

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
    if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen || !props.isPredictable) return
    
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
  if (!props.isTop || props.prediction || isFlying.value || !props.isLeagueOpen || !props.isPredictable) return
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

@keyframes bounce-soft {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.animate-bounce-soft {
  animation: bounce-soft 2s ease-in-out infinite;
}
</style>
