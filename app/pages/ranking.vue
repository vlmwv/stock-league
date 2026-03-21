<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-8">
        <h2 class="text-3xl font-black text-slate-100 tracking-tight mb-1">실시간 랭킹</h2>
        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Global Prediction Leaderboard</p>
      </div>

      <!-- Top 3 Highlights -->
      <div class="flex justify-center items-end gap-4 mb-12 mt-16 px-2">
        <!-- 2nd Place -->
        <div class="flex-1 flex flex-col items-center group">
          <div class="relative mb-4">
            <div class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Anna" alt="2nd" class="w-full h-full rounded-xl" />
            </div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-400 border-4 border-bg-deep flex items-center justify-center font-black text-slate-900 text-xs shadow-lg">2</div>
          </div>
          <p class="text-xs font-bold text-slate-300 mb-1">Anna</p>
          <div class="h-20 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
            <span class="text-xs font-black text-slate-400">2,450p</span>
          </div>
        </div>

        <!-- 1st Place -->
        <div class="flex-1 flex flex-col items-center group -translate-y-4">
          <div class="relative mb-4 scale-125">
             <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative w-16 h-16 rounded-2xl bg-slate-800 border-2 border-brand-primary p-1">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="1st" class="w-full h-full rounded-xl" />
            </div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-primary border-4 border-bg-deep flex items-center justify-center font-black text-white text-xs shadow-lg">1</div>
          </div>
          <p class="text-xs font-black text-brand-primary mb-1">Felix</p>
          <div class="h-28 w-full bg-gradient-to-t from-brand-primary/20 to-brand-primary/5 rounded-t-2xl border-t border-x border-brand-primary/20 flex flex-col items-center justify-center">
            <span class="text-sm font-black text-brand-primary">3,120p</span>
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="flex-1 flex flex-col items-center group">
          <div class="relative mb-4">
            <div class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700/50 p-1 group-hover:border-slate-500 transition-all">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe" alt="3rd" class="w-full h-full rounded-xl" />
            </div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 border-4 border-bg-deep flex items-center justify-center font-black text-white text-xs shadow-lg">3</div>
          </div>
          <p class="text-xs font-bold text-slate-300 mb-1">Zoe</p>
          <div class="h-16 w-full bg-gradient-to-t from-slate-800/80 to-slate-800/20 rounded-t-2xl border-t border-x border-white/5 flex flex-col items-center justify-center">
            <span class="text-xs font-black text-slate-400">2,100p</span>
          </div>
        </div>
      </div>

      <!-- Leaderboard List -->
      <div class="space-y-3">
        <div v-for="i in 10" :key="i" 
             class="glass-dark rounded-3xl p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors border border-white/5 group"
        >
          <div class="flex items-center gap-4">
            <span class="text-sm font-black text-slate-600 w-4">{{ i + 3 }}</span>
            <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
               <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`" alt="user" class="w-full h-full" />
            </div>
            <div>
              <p class="text-sm font-black text-slate-200">User_{{ i * 123 }}</p>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Master League</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-black text-slate-100">{{ (2000 - i * 150).toLocaleString() }}p</p>
            <p class="text-[10px] text-rose-500 font-bold flex items-center justify-end gap-1">
               <UIcon name="i-heroicons-arrow-trending-up" class="w-2.5 h-2.5" />
               +12
            </p>
          </div>
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
// Data can be fetched from API later
</script>
