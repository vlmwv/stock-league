<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// 서브 탭 상태 관리
const aiSubTab = ref<'history' | 'target'>('history')

// 보기 모드 상태 관리 ('list' 또는 'calendar')
const viewMode = ref<'list' | 'calendar'>('list')

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


      <!-- 서브 탭 전환 -->
      <div class="flex gap-2 mb-6">
        <button 
          class="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2"
          :class="aiSubTab === 'history' 
            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-lg shadow-brand-primary/5' 
            : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'"
          @click="aiSubTab = 'history'"
        >
          <UIcon name="i-heroicons-clock-20-solid" class="w-4 h-4" />
          추천 이력
        </button>
        <button 
          class="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2"
          :class="aiSubTab === 'target' 
            ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-lg shadow-brand-primary/5' 
            : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'"
          @click="aiSubTab = 'target'"
        >
          <UIcon name="i-heroicons-target" class="w-4 h-4" />
          목표가 리스트
        </button>
      </div>

      <!-- 추천 이력 보기 모드 토글 (리스트 / 달력) -->
      <div v-if="aiSubTab === 'history'" class="flex items-center justify-between mb-8 bg-slate-900/30 border border-white/5 rounded-2xl p-2.5 backdrop-blur-md">
        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">보기 방식</span>
        <div class="flex gap-1 bg-slate-950/40 p-0.5 rounded-xl border border-white/5">
          <button 
            class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
            :class="viewMode === 'list'
              ? 'bg-slate-800 text-brand-primary border border-white/5 shadow'
              : 'text-slate-500 hover:text-slate-400'"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-heroicons-queue-list" class="w-3.5 h-3.5" />
            리스트
          </button>
          <button 
            class="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
            :class="viewMode === 'calendar'
              ? 'bg-slate-800 text-brand-primary border border-white/5 shadow'
              : 'text-slate-500 hover:text-slate-400'"
            @click="viewMode = 'calendar'"
          >
            <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
            달력
          </button>
        </div>
      </div>

      <!-- 컨텐츠 영역 -->
      <div class="relative min-h-[400px]">
        <Transition name="fade" mode="out-in">
          <div :key="aiSubTab + '_' + viewMode">
            <template v-if="aiSubTab === 'history'">
              <RankingAiHistory v-if="viewMode === 'list'" />
              <RankingAiCalendar v-else-if="viewMode === 'calendar'" />
            </template>
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
