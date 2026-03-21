<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <!-- User Profile Card -->
      <section class="mb-10">
        <div class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 via-slate-800/40 to-slate-900/40 border border-white/10 p-8 shadow-3xl text-center">
          <div class="relative z-10">
            <div class="relative inline-block mb-6">
              <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-[2rem] blur opacity-30"></div>
              <div class="relative w-24 h-24 rounded-[2rem] bg-slate-800 border-2 border-slate-700 p-1 shadow-2xl overflow-hidden">
                <img :src="user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`" alt="Profile" class="w-full h-full rounded-[1.5rem]" />
              </div>
              <div class="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-primary border-4 border-slate-900 flex items-center justify-center">
                 <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-white" />
              </div>
            </div>
            
            <h2 class="text-2xl font-black text-slate-100 tracking-tight mb-1">{{ user?.user_metadata?.full_name || user?.email?.split('@')[0] }}님</h2>
            <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Master Prediction Tier</p>
            
            <div class="grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
              <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Rank</p>
                <p class="text-lg font-black text-brand-primary">#12</p>
              </div>
              <div class="border-x border-white/5">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Points</p>
                <p class="text-lg font-black text-slate-200">12.4k</p>
              </div>
              <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Win Rate</p>
                <p class="text-lg font-black text-emerald-400">68%</p>
              </div>
            </div>
          </div>

          <!-- Decorative blobs -->
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/10 blur-[60px] rounded-full"></div>
          <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-secondary/10 blur-[60px] rounded-full"></div>
        </div>
      </section>

      <!-- Stats Grid -->
      <section class="grid grid-cols-2 gap-4 mb-10">
        <div class="glass-dark rounded-3xl p-6 border border-white/5">
           <UIcon name="i-heroicons-fire" class="w-6 h-6 text-orange-500 mb-3" />
           <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Daily Streak</p>
           <p class="text-xl font-black text-slate-200">12 Days</p>
        </div>
        <div class="glass-dark rounded-3xl p-6 border border-white/5">
           <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-sky-500 mb-3" />
           <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Games</p>
           <p class="text-xl font-black text-slate-200">142</p>
        </div>
      </section>

      <!-- Prediction History Header -->
      <div class="px-2 mb-6 flex justify-between items-center">
        <h3 class="text-xl font-black text-slate-200 tracking-tight">최근 예측 기록</h3>
        <button class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">View All</button>
      </div>

      <!-- History List -->
      <div class="space-y-4">
        <div v-for="i in 5" :key="i" class="glass-dark rounded-3xl p-5 border border-white/5 flex items-center justify-between">
           <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs">
                 S{{ i }}
              </div>
              <div>
                <p class="text-sm font-black text-slate-200">Stock Name {{ i }}</p>
                <p class="text-[10px] text-slate-500 font-bold">2026.03.{{ 22 - i }}</p>
              </div>
           </div>
           <div class="text-right">
              <span 
                class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                :class="i % 2 === 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'"
              >
                {{ i % 2 === 0 ? 'Success' : 'Failed' }}
              </span>
              <p class="text-[10px] font-bold text-slate-600 mt-2 tracking-tighter">{{ i % 2 === 0 ? '+150p' : '-50p' }}</p>
           </div>
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const user = useSupabaseUser()
</script>
