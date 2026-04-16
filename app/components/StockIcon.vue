<template>
  <div 
    class="relative flex-shrink-0 flex items-center justify-center rounded-2xl overflow-hidden shadow-sm"
    :class="[sizeClasses, colorClasses]"
  >
    <!-- Stock Logo Image -->
    <img 
      v-if="logoUrl && !hasError" 
      :src="logoUrl" 
      :alt="name"
      class="w-full h-full object-contain p-1.5"
      @error="handleError"
    />
    
    <!-- Fallback Letter Icon -->
    <span 
      v-else 
      class="font-black text-white/90 select-none"
      :class="textClasses"
    >
      {{ firstLetter }}
    </span>

    <!-- Subtle Overlay for depth -->
    <div class="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none"></div>
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
  // 한국 종목 코드(6자리 숫자)인 경우 업비트 로고 활용
  if (/^[0-9]{6}$/.test(props.code)) {
    return `https://static.upbit.com/logos/${props.code}.png`
  }
  return null
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
    case 'md': return 'w-10 h-10'
    case 'lg': return 'w-14 h-14'
    case 'xl': return 'w-20 h-20'
    default: return 'w-10 h-10'
  }
})

const textClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-xs'
    case 'md': return 'text-sm'
    case 'lg': return 'text-xl'
    case 'xl': return 'text-3xl'
    default: return 'text-sm'
  }
})

const colorClasses = computed(() => {
  if (logoUrl.value && !hasError.value) return 'bg-white'
  
  // 종목 코드 기반으로 고정된 배경색 할당 (해시)
  const colors = [
    'bg-gradient-to-br from-rose-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-sky-500 to-sky-600',
    'bg-gradient-to-br from-violet-500 to-violet-600',
    'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600'
  ]
  
  const charCodeSum = props.code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[charCodeSum % colors.length]
})
</script>
