<script setup lang="ts">
// 랭킹 페이지는 이제 사용자 랭킹만 보여줌
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-10">
        <h2 class="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <UIcon name="i-heroicons-trophy-20-solid" class="text-brand-primary" />
          사용자 랭킹
        </h2>
        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Global User Leaderboard</p>
      </div>

      <RankingUser />
    </main>

    <BottomNav />
  </div>
</template>
