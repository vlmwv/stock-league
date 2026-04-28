<script setup lang="ts">
// 랭킹 페이지는 이제 사용자 랭킹만 보여줌
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">


      <RankingUser />
    </main>

    <BottomNav />
  </div>
</template>
