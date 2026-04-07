<template>
  <Transition name="fade">
    <div v-if="isKakaoTalk" class="fixed inset-0 z-[1000] flex items-center justify-center px-6">
      <!-- Backdrop with heavy blur for premium feel -->
      <div class="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl"></div>
      
      <div class="relative w-full max-w-sm glass-dark rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden animate-scale-in">
        <!-- Decoration -->
        <div class="absolute -top-20 -right-20 w-64 h-64 bg-brand-primary/20 blur-[100px] rounded-full"></div>
        <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-secondary/20 blur-[100px] rounded-full"></div>

        <div class="p-10 pt-12 text-center relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-6">
            <UIcon name="i-heroicons-shield-check-20-solid" class="w-4 h-4 text-brand-primary" />
            <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">안전한 로그인 안내</span>
          </div>
          
          <h2 class="text-2xl font-black text-slate-100 mb-4 leading-tight tracking-tighter">
            구글 로그인을 위해 <br/>
            <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">외부 브라우저</span>가 필요합니다
          </h2>
          
          <p class="text-sm text-slate-400 mb-10 leading-relaxed font-medium">
            카카오톡 내부에서는 구글의 보안 정책상 <br/>
            로그인이 제한됩니다. 아래 안내에 따라 <br/>
            시스템 브라우저로 이동해 주세요!
          </p>

          <!-- Instructions based on OS -->
          <div class="space-y-6 text-left mb-10">
            <!-- Android Guide -->
            <div v-if="isAndroid" class="space-y-4">
              <button 
                @click="redirectToExternalBrowser"
                class="w-full py-4.5 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-slate-900 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                크롬으로 지금 바로 이동
              </button>
              <p class="text-[10px] text-center text-slate-500 font-bold">자동으로 이동하지 않을 시 버튼을 클릭해 주세요</p>
            </div>

            <!-- iOS Guide -->
            <div v-if="isIOS" class="space-y-6">
              <div class="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div class="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-200">1</div>
                <p class="text-xs text-slate-300 leading-relaxed pt-1">오른쪽 하단의 <span class="text-slate-100 font-bold">[ 더보기(···) ]</span> 버튼을 클릭합니다.</p>
              </div>
              <div class="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div class="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-200">2</div>
                <p class="text-xs text-slate-300 leading-relaxed pt-1"><span class="text-brand-primary font-bold">[ Safari 브라우저로 열기 ]</span>를 선택해 주세요.</p>
              </div>
            </div>
          </div>
          
          <p class="text-[9px] text-slate-600 font-bold uppercase tracking-widest opacity-60">
            SECURE LOGIN ENVIRONMENT REQUIRED
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const isKakaoTalk = ref(false)
const isAndroid = ref(false)
const isIOS = ref(false)

onMounted(() => {
  const ua = navigator.userAgent.toLowerCase()
  isKakaoTalk.value = ua.includes('kakaotalk')
  isAndroid.value = ua.includes('android')
  isIOS.value = /iphone|ipad|ipod/i.test(ua)

  // Android attempt auto redirect
  if (isKakaoTalk.value && isAndroid.value) {
    redirectToExternalBrowser()
  }
})

function redirectToExternalBrowser() {
  const currentUrl = window.location.href
  // Use intent scheme for Android to force Chrome
  if (isAndroid.value) {
    location.href = `intent://${currentUrl.replace(/https?:\/\//i, '')}#Intent;scheme=https;package=com.android.chrome;end`
  }
}
</script>

<style scoped>
.glass-dark {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.animate-scale-in {
  animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
