<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// 서브 탭 상태 관리
const aiSubTab = ref<'history' | 'target'>('history')

// 쿼리 파라미터 연동
onMounted(() => {
  const sub = route.query.sub as string
  if (sub === 'target') {
    aiSubTab.value = 'target'
  } else {
    aiSubTab.value = 'history'
  }
})

// 탭 변경 시 쿼리 파라미터 업데이트
watch(aiSubTab, (newSub) => {
  router.replace({
    query: {
      ...route.query,
      sub: newSub
    }
  })
})
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-10">
        <h2 class="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles-20-solid" class="text-brand-primary" />
          AI 추천 인사이트
        </h2>
        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">AI-Powered Market Analysis</p>
      </div>

      <!-- 서브 탭 전환 -->
      <div class="flex gap-2 mb-8">
        <button 
          @click="aiSubTab = 'history'"
          class="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2"
          :class="aiSubTab === 'history' 
            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-lg shadow-brand-primary/5' 
            : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'"
        >
          <UIcon name="i-heroicons-clock-20-solid" class="w-4 h-4" />
          추천 이력
        </button>
        <button 
          @click="aiSubTab = 'target'"
          class="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2"
          :class="aiSubTab === 'target' 
            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-lg shadow-brand-primary/5' 
            : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'"
        >
          <UIcon name="i-heroicons-target" class="w-4 h-4" />
          목표가 리스트
        </button>
      </div>

      <!-- 컨텐츠 영역 -->
      <div class="relative min-h-[400px]">
        <Transition name="fade" mode="out-in">
          <div :key="aiSubTab">
            <RankingAiHistory v-if="aiSubTab === 'history'" />
            <RankingAiTarget v-else-if="aiSubTab === 'target'" />
          </div>
        </Transition>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
