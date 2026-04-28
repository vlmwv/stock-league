<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// 탭 상태 관리
const mainTab = ref<'user' | 'ai'>('user')
const aiSubTab = ref<'history' | 'target'>('history')

// 쿼리 파라미터 연동
onMounted(() => {
  const tab = route.query.tab as string
  const sub = route.query.sub as string
  
  if (tab === 'ai') {
    mainTab.value = 'ai'
    if (sub === 'target') {
      aiSubTab.value = 'target'
    } else {
      aiSubTab.value = 'history'
    }
  } else {
    mainTab.value = 'user'
  }
})

// 탭 변경 시 쿼리 파라미터 업데이트
watch([mainTab, aiSubTab], ([newMain, newSub]) => {
  router.replace({
    query: {
      ...route.query,
      tab: newMain,
      sub: newMain === 'ai' ? newSub : undefined
    }
  })
})
</script>

<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <!-- 메인 탭 전환 -->
      <div class="flex p-1 bg-slate-800/40 rounded-2xl border border-white/5 mb-8">
        <button 
          @click="mainTab = 'user'"
          class="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
          :class="mainTab === 'user' ? 'bg-brand-primary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'"
        >
          <UIcon name="i-heroicons-user-group-20-solid" class="w-4 h-4" />
          사용자 랭킹
        </button>
        <button 
          @click="mainTab = 'ai'"
          class="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
          :class="mainTab === 'ai' ? 'bg-brand-primary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'"
        >
          <UIcon name="i-heroicons-sparkles-20-solid" class="w-4 h-4" />
          AI 추천 인사이트
        </button>
      </div>

      <!-- AI 서브 탭 (AI 메인 탭일 때만 표시) -->
      <Transition name="fade-slide">
        <div v-if="mainTab === 'ai'" class="flex gap-2 mb-8">
          <button 
            @click="aiSubTab = 'history'"
            class="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2"
            :class="aiSubTab === 'history' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'"
          >
            <UIcon name="i-heroicons-clock-20-solid" class="w-3.5 h-3.5" />
            추천 이력
          </button>
          <button 
            @click="aiSubTab = 'target'"
            class="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2"
            :class="aiSubTab === 'target' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'"
          >
            <UIcon name="i-heroicons-target" class="w-3.5 h-3.5" />
            목표가 리스트
          </button>
        </div>
      </Transition>

      <!-- 탭별 컨텐츠 -->
      <div class="relative min-h-[400px]">
        <Transition name="fade" mode="out-in">
          <div :key="mainTab + (mainTab === 'ai' ? aiSubTab : '')">
            <RankingUser v-if="mainTab === 'user'" />
            <div v-else-if="mainTab === 'ai'">
              <RankingAiHistory v-if="aiSubTab === 'history'" />
              <RankingAiTarget v-else-if="aiSubTab === 'target'" />
            </div>
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

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
