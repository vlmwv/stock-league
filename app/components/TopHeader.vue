<template>
  <header class="sticky top-0 z-[60] w-full glass-dark px-6 py-4 flex justify-between items-center transition-all duration-300" :class="{ 'py-3 shadow-2xl shadow-indigo-500/10': isScrolled }">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
        <span class="text-white font-black text-xs leading-none">SL</span>
      </div>
      <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
        주식 예측 리그
      </h1>
    </div>

    <div class="flex items-center gap-3">
      <button class="relative p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-slate-700/50">
        <UIcon name="i-heroicons-bell" class="w-5 h-5 text-slate-300" />
        <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
      </button>
      
      <div class="flex items-center gap-2 pl-2 border-l border-slate-700/50">
        <div class="text-right hidden xs:block">
          <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Level 12</p>
          <p class="text-xs font-bold text-slate-200">김주식님</p>
        </div>
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 p-[2px] shadow-inner overflow-hidden">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" class="w-full h-full rounded-[10px] object-cover" />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const isScrolled = ref(false)

onMounted(() => {
  window.addEventListener('scroll', () => {
    isScrolled.value = window.scrollY > 20
  })
})
</script>

<style scoped>
.xs\:block {
  @media (min-width: 400px) {
    display: block;
  }
}
</style>
