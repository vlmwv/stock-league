<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-950">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mx-auto mb-6"></div>
      <h2 class="text-xl font-bold text-white mb-2">인증 확인 중...</h2>
      <p class="text-slate-400">잠시만 기다려 주세요.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const router = useRouter()

// 로그인이 완료되면 자동 리다이렉트
watchEffect(() => {
  if (user.value) {
    router.replace('/')
  }
})

// 만약 일정 시간 동안 로그인이 안 되면 (에러 등) 로그인 페이지로 복귀
onMounted(() => {
  setTimeout(() => {
    if (!user.value) {
      router.replace('/login')
    }
  }, 5000)
})

definePageMeta({
  layout: false
})
</script>
