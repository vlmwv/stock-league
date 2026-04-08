<template>
  <UModal v-model:open="isOpen">
    <UCard class="bg-slate-900/90 border-white/10 ring-1 ring-white/10 backdrop-blur-xl">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-white">프로필 수정</h3>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isOpen = false" />
        </div>
      </template>

      <div class="space-y-4">
        <UFormGroup label="닉네임" name="username">
          <UInput v-model="newUsername" placeholder="새 닉네임을 입력하세요" color="neutral" variant="outline" size="lg" autofocus />
        </UFormGroup>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isOpen = false">취소</UButton>
          <UButton color="primary" :loading="updating" @click="handleUpdateProfile">저장하기</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  currentUsername?: string
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { updateProfile } = useStock()
const toast = useToast()

const newUsername = ref('')
const updating = ref(false)

watch(() => props.modelValue, (val) => {
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
