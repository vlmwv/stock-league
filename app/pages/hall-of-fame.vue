<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-10 text-center">
        <div class="inline-block p-4 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 shadow-2xl shadow-amber-500/10">
           <UIcon name="i-heroicons-sparkles" class="w-10 h-10 text-amber-500 animate-pulse" />
        </div>
        <h2 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-tighter mb-2">명예의 전당</h2>
        <p class="text-[10px] text-amber-500/60 font-black uppercase tracking-[0.3em]">The Legends of Prediction League</p>
      </div>

      <!-- Hall of Fame Cards -->
      <div class="space-y-12">
        <section v-for="period in hallOfFame" :key="period.title" class="relative">
          <div class="flex items-center gap-4 mb-6">
             <div class="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/20"></div>
             <h3 class="text-sm font-black text-amber-500/80 uppercase tracking-widest whitespace-nowrap">{{ period.title }}</h3>
             <div class="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/20"></div>
          </div>

          <div class="grid grid-cols-1 gap-6">
            <div v-for="winner in period.winners" :key="winner.name" 
                 class="relative overflow-hidden group"
            >
               <div class="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-700 rounded-[2.5rem] blur opacity-10 group-hover:opacity-30 transition-opacity"></div>
               <div class="relative glass-dark rounded-[2.5rem] p-8 border border-amber-500/10 flex items-center gap-6">
                  <div class="relative">
                     <div class="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-amber-500/30 p-1">
                        <img :src="winner.avatar" :alt="winner.name" class="w-full h-full rounded-xl" />
                     </div>
                     <div class="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-amber-500 border-4 border-bg-deep flex items-center justify-center shadow-xl">
                        <UIcon name="i-heroicons-trophy-20-solid" class="w-5 h-5 text-bg-deep" />
                     </div>
                  </div>
                  
                  <div>
                    <p class="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">{{ period.subtitle }}</p>
                    <h4 class="text-xl font-black text-slate-100 tracking-tight mb-2">{{ winner.name }}</h4>
                    <div class="flex items-center gap-3">
                       <span class="text-xs font-bold text-slate-400">Profit:</span>
                       <span class="text-sm font-black text-emerald-400">+{{ winner.profit }}%</span>
                    </div>
                  </div>

                  <!-- Background Crown Icon -->
                  <div class="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <UIcon name="i-heroicons-user-group-20-solid" class="w-24 h-24 text-amber-500" />
                  </div>
               </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
const hallOfFame = [
  {
    title: '2026 Annual Legends',
    subtitle: 'Current Season Leaders',
    winners: [
      { name: 'StockKing_99', profit: '42.5', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=King' },
      { name: 'BearHunter', profit: '38.2', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear' }
    ]
  },
  {
    title: '2025 Hall of Fame',
    subtitle: 'All-Time Grand Champions',
    winners: [
      { name: 'LunarPredictor', profit: '512.8', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Moon' },
      { name: 'DiamondHands', profit: '489.1', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diamond' }
    ]
  }
]
</script>
