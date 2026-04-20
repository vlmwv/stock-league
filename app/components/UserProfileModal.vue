<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
        <div class="absolute inset-0" @click="$emit('update:open', false)"></div>
        
        <div class="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden transform transition-all duration-300 scale-100">
          <div class="px-8 py-10">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-2xl font-black text-white tracking-tight">프로필 수정</h3>
              <button @click="$emit('update:open', false)" class="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-6 h-6" />
              </button>
            </div>
            
            <div class="space-y-6">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">이메일 (수정 불가)</label>
                <div class="relative">
                   <input 
                    :value="currentEmail" 
                    type="email"
                    disabled
                    class="w-full h-14 bg-slate-800/30 border border-white/5 rounded-2xl px-5 text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">이름 (실명)</label>
                <div class="relative">
                   <input 
                    v-model="fullName" 
                    type="text"
                    placeholder="이름을 입력하세요" 
                    class="w-full h-14 bg-slate-800/50 border border-white/10 rounded-2xl px-5 text-white font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                    @keyup.enter="handleUpdateProfile"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">닉네임</label>
                <div class="relative">
                   <input 
                    v-model="username" 
                    type="text"
                    placeholder="새 닉네임을 입력하세요" 
                    class="w-full h-14 bg-slate-800/50 border border-white/10 rounded-2xl px-5 text-white font-bold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                    @keyup.enter="handleUpdateProfile"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">노출 설정</label>
                <div class="grid grid-cols-2 gap-3">
                  <button 
                    v-for="opt in [
                      { value: 'nickname', label: '닉네임 노출' },
                      { value: 'full_name', label: '이름 노출' }
                    ]"
                    :key="opt.value"
                    @click="displayNameType = opt.value as any"
                    type="button"
                    class="h-14 rounded-2xl border transition-all flex items-center justify-center gap-2"
                    :class="displayNameType === opt.value 
                      ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' 
                      : 'bg-slate-800/50 border-white/10 text-slate-500 hover:border-white/20'"
                  >
                    <UIcon :name="displayNameType === opt.value ? 'i-heroicons-check-circle-20-solid' : 'i-heroicons-circle'" class="w-5 h-5" />
                    <span class="text-xs font-bold">{{ opt.label }}</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">프로필 이미지 노출 여부</label>
                <div class="flex items-center gap-4 bg-slate-800/50 border border-white/10 rounded-2xl p-4">
                  <div class="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img v-if="useAvatar && avatarUrl" :src="avatarUrl" class="w-full h-full object-cover" />
                    <UIcon v-else :name="gender === 'female' ? 'i-mdi-gender-female' : gender === 'male' ? 'i-mdi-gender-male' : 'i-heroicons-user-20-solid'" class="w-7 h-7 text-slate-600" />
                  </div>
                  <div class="flex-1">
                    <p class="text-xs font-bold text-slate-200">{{ useAvatar ? '이미지 노출 중' : '이미지 숨김 처리' }}</p>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5">이미지를 숨기면 성별에 따른 기본 아이콘이 노출됩니다.</p>
                  </div>
                  <UToggle v-model="useAvatar" color="primary" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">성별 (기본 아바타 설정)</label>
                <div class="grid grid-cols-3 gap-3">
                  <button 
                    v-for="g in [
                      { value: 'male', label: '남성', icon: 'i-mdi-gender-male' },
                      { value: 'female', label: '여성', icon: 'i-mdi-gender-female' },
                      { value: 'none', label: '선택 안함', icon: 'i-heroicons-minus' }
                    ]"
                    :key="g.value"
                    @click="gender = g.value"
                    type="button"
                    class="h-14 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1"
                    :class="gender === g.value 
                      ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' 
                      : 'bg-slate-800/50 border-white/10 text-slate-500 hover:border-white/20'"
                  >
                    <UIcon :name="g.icon" class="w-5 h-5" />
                    <span class="text-[10px] font-bold">{{ g.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-10">
              <button 
                @click="$emit('update:open', false)"
                class="h-14 rounded-2xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-colors"
              >
                취소
              </button>
              <button 
                @click="handleUpdateProfile"
                :disabled="updating"
                class="h-14 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <UIcon v-if="updating" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                저장하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  currentUsername?: string
  currentFullName?: string
  currentGender?: string
  currentEmail?: string
  currentAvatarUrl?: string
  currentDisplayNameType?: 'nickname' | 'full_name'
}>()

const emit = defineEmits(['update:open', 'success'])

const { updateProfile } = useStock()
const toast = useToast()

const username = ref('')
const fullName = ref('')
const displayNameType = ref<'nickname' | 'full_name'>('nickname')
const gender = ref('none')
const avatarUrl = ref('')
const useAvatar = ref(true)
const updating = ref(false)

const user = useSupabaseUser()

watch(() => props.open, (val) => {
  if (val) {
    username.value = props.currentUsername || ''
    fullName.value = props.currentFullName || ''
    displayNameType.value = props.currentDisplayNameType || 'nickname'
    gender.value = props.currentGender || 'none'
    avatarUrl.value = props.currentAvatarUrl || user.value?.user_metadata?.avatar_url || ''
    useAvatar.value = !!props.currentAvatarUrl
  }
})

const handleUpdateProfile = async () => {
  const trimmedNickname = username.value.trim()
  if (!trimmedNickname) {
    toast.add({ title: '닉네임을 입력해주세요.', color: 'error' })
    return
  }
  
  updating.value = true
  const result = await updateProfile({
    username: trimmedNickname,
    fullName: fullName.value.trim(),
    gender: gender.value === 'none' ? null : gender.value,
    avatarUrl: useAvatar.value ? avatarUrl.value : null,
    displayNameType: displayNameType.value
  })
  
  if (result.success) {
    emit('success')
    emit('update:open', false)
    toast.add({
      title: '프로필 업데이트 성공!',
      description: '프로필 정보가 성공적으로 변경되었습니다.',
      color: 'primary',
      icon: 'i-heroicons-check-circle'
    })
  } else {
    toast.add({
      title: '프로필 업데이트 실패',
      description: result.message || '오류가 발생했습니다.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
  updating.value = false
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-active .relative, .fade-leave-active .relative {
  transition: transform 0.3s ease;
}
.fade-enter-from .relative, .fade-leave-to .relative {
  transform: scale(0.95);
}
</style>
