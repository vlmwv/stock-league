<template>
  <UModal v-model:open="isOpen">
    <UCard
      class="w-full max-w-sm"
      :ui="{
        background: 'bg-slate-900/95 backdrop-blur-xl',
        divide: 'divide-white/5',
        ring: 'ring-1 ring-white/10',
        header: 'border-b border-white/5 bg-white/5 px-6 py-4',
        body: 'px-8 py-10',
        footer: 'border-t border-white/5 bg-white/5 px-6 py-4'
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-white tracking-tight">프로필 수정</h3>
          <UButton 
            color="neutral" 
            variant="ghost" 
            icon="i-heroicons-x-mark-20-solid" 
            class="-my-1 hover:bg-white/10" 
            @click="isOpen = false" 
          />
        </div>
      </template>

      <div class="space-y-6">
        <UFormField label="닉네임" name="username">
          <UInput 
            v-model="newUsername" 
            placeholder="새 닉네임을 입력하세요" 
            size="xl"
            color="primary"
            variant="outline"
            class="w-full"
            autofocus 
          />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton 
            color="neutral" 
            variant="ghost" 
            label="취소"
            class="font-bold px-6 py-2.5 rounded-xl hover:bg-white/5"
            @click="isOpen = false" 
          />
          <UButton 
            color="primary" 
            :loading="updating" 
            label="저장하기"
            class="font-black px-8 py-2.5 rounded-xl shadow-lg shadow-brand-primary/20"
            @click="handleUpdateProfile" 
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  currentUsername?: string
}>()

const emit = defineEmits(['update:open', 'success'])

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const { updateProfile } = useStock()
const toast = useToast()

const newUsername = ref('')
const updating = ref(false)

watch(() => props.open, (val) => {
  if (val) {
    newUsername.value = props.currentUsername || ''
  }
})

const handleUpdateProfile = async () => {
  if (!newUsername.value.trim()) return
  
  updating.value = true
  const result = await updateProfile(newUsername.value.trim())
  
  if (result.success) {
    emit('success', newUsername.value.trim())
    isOpen.value = false
    toast.add({
      title: '프로필 업데이트 성공!',
      description: '닉네임이 성공적으로 변경되었습니다.',
      color: 'success',
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
