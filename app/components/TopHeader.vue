<template>
  <header class="sticky top-0 z-[500] w-full glass-dark px-4 py-2.5 flex justify-between items-center transition-all duration-300" :class="{ 'py-2 shadow-2xl shadow-indigo-500/10': isScrolled }">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
        <span class="text-white font-black text-xs leading-none">SL</span>
      </div>
      <h1 class="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent tracking-tight truncate max-w-[150px] sm:max-w-none">
        주식 예측 리그
      </h1>
    </div>

    <div class="flex items-center gap-3">
      <button 
        @click="$emit('openGuide')"
        class="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-white/5 active:scale-95"
        title="가이드 보기"
      >
        <UIcon name="i-heroicons-question-mark-circle-20-solid" class="w-5 h-5 text-brand-primary" />
      </button>

      <!-- Admin Dashboard Link (Only for Admins) -->
      <NuxtLink 
        v-if="user && role === 'admin'"
        to="/admin"
        class="p-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 transition-all border border-brand-primary/30 active:scale-95 group"
        title="관리자 대시보드"
      >
        <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform" />
      </NuxtLink>

      <template v-if="user">
        <UPopover 
          :popper="{ placement: 'bottom-end', offsetDistance: 12 }" 
          :ui="{ popper: { zIndex: 'z-[9999]' } }"
          class="relative z-30"
        >
          <button class="relative p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-slate-700/50 group">
            <UIcon name="i-heroicons-bell" class="w-5 h-5 text-slate-300 group-hover:text-brand-primary transition-colors" />
            <span v-if="hasNewNotifications" class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </button>

          <template #content>
            <div class="w-80 bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative z-[9999]">
              <div class="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                <h3 class="text-xs font-black text-slate-200 uppercase tracking-widest">새로운 소식</h3>
                <span class="text-[10px] font-bold text-brand-primary bg-brand-primary/20 px-2 py-0.5 rounded-full border border-brand-primary/30">New</span>
              </div>
              
              <div class="max-h-[320px] overflow-y-auto no-scrollbar">
                <template v-if="recommendedStocks && recommendedStocks.length > 0">
                  <div 
                    v-for="news in recommendedStocks.slice(0, 5)" 
                    :key="news.id"
                    class="px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div class="flex flex-col gap-1">
                      <div class="flex justify-between items-start gap-2">
                        <span class="text-[10px] font-black text-brand-primary uppercase tracking-tight">{{ news.name }}</span>
                        <span class="text-[10px] text-slate-500 font-medium">방금 전</span>
                      </div>
                      <h4 class="text-xs font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {{ news.summary }}
                      </h4>
                    </div>
                  </div>
                </template>
                <div v-else class="px-4 py-10 text-center">
                  <UIcon name="i-heroicons-bell-slash" class="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p class="text-xs text-slate-500 font-medium">새로운 소식이 없습니다.</p>
                </div>
              </div>

              <div class="p-2 bg-slate-900/50 border-t border-white/5">
                <button class="w-full py-2 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">
                  모든 알림 보기
                </button>
              </div>
            </div>
          </template>
        </UPopover>
        
        <div class="flex items-center gap-2 pl-2 border-l border-slate-700/50 relative z-20">
          <div class="text-right hidden xs:block">
            <p class="text-xs font-bold text-slate-200">{{ user.user_metadata?.full_name || user.email?.split('@')[0] }}님</p>
          </div>
          <UPopover 
            :popper="{ placement: 'bottom-end' }"
            :ui="{ popper: { zIndex: 'z-[9999]' } }"
          >
            <button class="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 p-[2px] shadow-inner overflow-hidden">
              <img :src="user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`" alt="Avatar" class="w-full h-full rounded-[10px] object-cover" />
            </button>
            <template #content>
              <div class="p-2 w-48 bg-slate-950 border border-white/20 rounded-xl shadow-2xl ring-1 ring-white/10 relative z-[9999]">
                <div class="px-3 py-2 border-b border-slate-700/50 mb-1">
                  <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">계정 정보</p>
                  <p class="text-xs text-slate-300 truncate">{{ user.email }}</p>
                </div>
                <button 
                  @click.prevent="handleLogout"
                  class="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            </template>
          </UPopover>
        </div>
      </template>
      <template v-else>
        <NuxtLink 
          to="/login"
          class="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 active:scale-[0.98] transition-all"
        >
          로그인
        </NuxtLink>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const isScrolled = ref(false)
const userStats = ref<any>(null)

defineEmits(['openGuide'])

const { recommendedStocks, refreshRecommended, fetchUserStats } = useStock()
const hasNewNotifications = computed(() => recommendedStocks.value && recommendedStocks.value.length > 0)
const role = ref('user')

const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    // window.location.href를 사용하여 확실하게 상태를 초기화하고 로그인 페이지로 이동
    window.location.href = '/login'
  } catch (e) {
    console.error('Logout error:', e)
    window.location.href = '/login'
  }
}

onMounted(async () => {
  await refreshRecommended()
  
  if (user.value) {
    userStats.value = await fetchUserStats()
    if (userStats.value) role.value = userStats.value.role
  }

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
