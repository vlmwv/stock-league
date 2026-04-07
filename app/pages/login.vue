<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>

    <div class="w-full max-w-md z-10">
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary shadow-lg shadow-brand-primary/20 mb-6">
          <span class="text-white font-black text-2xl">SL</span>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">반가워요!</h1>
        <p class="text-slate-400">주식 예측 리그에 오신 것을 환영합니다</p>
      </div>

      <div class="glass-dark p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <!-- Auth Providers -->
        <div class="space-y-4 mb-8">
          <button 
            @click="handleOAuthLogin('google')"
            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white text-slate-900 font-bold transition-all hover:bg-slate-100 active:scale-[0.98] shadow-lg shadow-white/5"
          >
            <UIcon name="i-logos-google-icon" class="w-5 h-5" />
            구글로 시작하기
          </button>

          <button 
            @click="handleOAuthLogin('kakao')"
            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-[#FEE500] text-[#3c1e1e] font-bold transition-all hover:bg-[#FDD835] active:scale-[0.98] shadow-lg shadow-yellow-500/5"
          >
            <UIcon name="i-ri-kakao-talk-fill" class="w-5 h-5" />
            카카오로 시작하기
          </button>

          <button 
            @click="handleOAuthLogin('naver')"
            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-[#03C75A] text-white font-bold transition-all hover:bg-[#02b350] active:scale-[0.98] shadow-lg shadow-green-500/5"
          >
            <UIcon name="i-simple-icons-naver" class="w-4 h-4" />
            네이버로 시작하기
          </button>
        </div>

        <div class="relative mb-8">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-700/50"></div>
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-[#1e293b] px-4 text-slate-500 font-medium">또는 이메일로</span>
          </div>
        </div>

        <!-- Email/Password Form -->
        <form @submit.prevent="handleEmailLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">이메일</label>
            <input 
              v-model="email"
              type="email" 
              placeholder="example@email.com"
              class="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
            <input 
              v-model="password"
              type="password" 
              placeholder="••••••••"
              class="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              required
            />
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full py-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            로그인 / 회원가입
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-slate-500 italic">
          계정이 없으면 자동으로 회원가입이 진행됩니다.
        </p>
      </div>

      <div class="mt-10 text-center">
        <NuxtLink to="/" class="text-slate-400 hover:text-white transition-colors text-sm font-medium inline-flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          홈으로 돌아가기
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)

// 이미 로그인되어 있다면 리다이렉트
watchEffect(() => {
  if (user.value) {
    router.replace('/')
  }
})

const handleOAuthLogin = async (provider: 'google' | 'kakao' | 'naver') => {
  try {
    const options: any = {
      redirectTo: `${window.location.origin}/auth/confirm`
    }
    
    // 카카오의 경우, 비즈니스 인증이 필요한 'account_email'을 강제로 제외하기 위함
    if (provider === 'kakao') {
      options.scopes = 'profile_nickname profile_image'
      options.queryParams = { scope: 'profile_nickname profile_image' }
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options
    })
    if (error) throw error
  } catch (error: any) {
    alert(error.message)
  }
}

const handleEmailLogin = async () => {
  loading.value = true
  try {
    // 먼저 로그인을 시도
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (signInError) {
      // 로그인 실패 시 회원가입 시도 (계정이 없을 경우)
      if (signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.value,
          password: password.value,
        })
        if (signUpError) throw signUpError
        alert('회원가입 확인 메일이 발송되었습니다 (만약 설정되어 있다면).')
      } else {
        throw signInError
      }
    } else {
      router.replace('/')
    }
  } catch (error: any) {
    alert(error.message)
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: false
})
</script>
