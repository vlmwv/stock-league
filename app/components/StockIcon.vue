<template>
  <div 
    class="relative flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10 shadow-sm transition-all duration-300 bg-slate-900/40"
    :class="[sizeClasses, roundingClasses]"
  >
    <!-- Stock Logo Image (Brand CI) -->
    <div v-if="logoUrl && !hasError" class="w-full h-full flex items-center justify-center p-1.5 relative z-10">
      <img 
        :src="logoUrl" 
        :alt="name"
        class="w-full h-full object-contain opacity-100 transition-opacity duration-300"
        :class="roundingClasses"
        referrerpolicy="no-referrer"
        @error="handleError"
      />
    </div>


    
    <!-- Fallback Letter Icon (Framed Style to match CI) -->
    <div v-else class="w-full h-full flex items-center justify-center p-1.5 relative z-10">
      <div 
        class="w-full h-full flex items-center justify-center shadow-lg"
        :class="[colorClasses, roundingClasses]"
      >
        <span 
          class="font-black text-white/95 select-none drop-shadow-md"
          :class="textClasses"
        >
          {{ firstLetter }}
        </span>
      </div>
    </div>

    <!-- Subtle Overlay for depth -->
    <div class="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none z-20" :class="roundingClasses"></div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  code: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  size: 'md'
})

const hasError = ref(false)

const logoUrl = computed(() => {
  if (!props.code) return null
  
  // 한국 종목 코드(6자리 숫자)인 경우 알파스퀘어 로고 활용 (증권플러스 다운 대비)
  if (/^[0-9]{6}$/.test(props.code)) {
    // 알파스퀘어 실시간 로고 서버 (브랜드 이미지)
    return `https://file.alphasquare.co.kr/media/images/stock_logo/kr/${props.code}.png`
  }
  
  // 해외 종목 등 기타 (기존 업비트 로고 폴백)
  return `https://static.upbit.com/logos/${props.code}.png`
})

const firstLetter = computed(() => {
  return props.name?.charAt(0) || '?'
})


const handleError = () => {
  hasError.value = true
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-8 h-8'
    case 'md': return 'w-12 h-12'
    case 'lg': return 'w-16 h-16'
    case 'xl': return 'w-24 h-24'
    default: return 'w-12 h-12'
  }
})

const roundingClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'rounded'
    case 'md': return 'rounded-md'
    case 'lg': return 'rounded-lg'
    case 'xl': return 'rounded-xl'
    default: return 'rounded-md'
  }
})

const textClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-[10px]'
    case 'md': return 'text-xs'
    case 'lg': return 'text-lg'
    case 'xl': return 'text-2xl'
    default: return 'text-xs'
  }
})

const colorClasses = computed(() => {
  // 종목 코드 기반으로 고정된 배경색 할당 (해시)
  const colors = [
    'bg-gradient-to-br from-rose-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-sky-500 to-sky-600',
    'bg-gradient-to-br from-violet-500 to-violet-600',
    'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
    'bg-gradient-to-br from-brand-primary to-brand-primary-dark'
  ]
  
  const codeStr = String(props.code || '000000')
  const charCodeSum = codeStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[charCodeSum % colors.length]
})

</script>
