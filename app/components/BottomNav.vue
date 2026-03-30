<template>
  <nav class="fixed bottom-4 inset-x-4 h-14 glass-dark rounded-2xl z-50 flex justify-around items-center px-4 shadow-2xl shadow-indigo-500/10 border border-white/5 transition-all duration-300">
    <NuxtLink 
      v-for="item in navItems" 
      :key="item.id"
      :to="item.to"
      class="flex flex-col items-center gap-1 group transition-all duration-300"
      active-class="text-brand-primary"
      exact-active-class="text-brand-primary"
    >
      <div 
        class="relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 group-[.router-link-active]:bg-brand-primary/10 group-[.router-link-active]:shadow-lg group-[.router-link-active]:shadow-brand-primary/5 group-hover:bg-slate-800/50"
      >
        <UIcon :name="item.icon" class="w-6 h-6" />
        <span 
          class="absolute -bottom-1 w-1 h-1 bg-brand-primary rounded-full animate-pulse opacity-0 group-[.router-link-active]:opacity-100"
        ></span>
      </div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-[.router-link-active]:text-brand-primary">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const navItems = [
  { id: 'home', label: '홈', icon: 'i-heroicons-home-20-solid', to: '/' },
  { id: 'stocks', label: '종목', icon: 'i-heroicons-chart-bar-20-solid', to: '/stocks' },
  { id: 'ranking', label: '랭킹', icon: 'i-heroicons-trophy-20-solid', to: '/ranking' },
  { id: 'news', label: '뉴스', icon: 'i-heroicons-newspaper-20-solid', to: '/news' },
  { id: 'mypage', label: '마이', icon: 'i-heroicons-user-20-solid', to: '/mypage' }
]

</script>
