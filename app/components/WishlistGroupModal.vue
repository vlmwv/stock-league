<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <div class="absolute inset-0" @click="$emit('update:open', false)"></div>
        
        <div class="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden transform transition-all duration-300 scale-100 my-auto">
          <div class="px-8 py-10">
            <div class="flex items-center justify-between mb-8">
              <h3 class="text-2xl font-black text-white tracking-tight">폴더 선택</h3>
              <button @click="$emit('update:open', false)" class="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-6 h-6" />
              </button>
            </div>
            
            <div class="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              <button 
                v-for="group in wishlistGroups" 
                :key="group.id"
                @click="toggleSelection(group.id)"
                class="w-full h-16 rounded-2xl border transition-all flex items-center justify-between px-5"
                :class="selectedGroupIds.includes(group.id) 
                  ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' 
                  : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'"
              >
                <div class="flex items-center gap-3">
                  <UIcon :name="group.icon || 'i-heroicons-folder'" class="w-5 h-5" />
                  <span class="text-sm font-bold">{{ group.name }}</span>
                </div>
                <UIcon 
                  :name="selectedGroupIds.includes(group.id) ? 'i-heroicons-check-circle-20-solid' : 'i-heroicons-circle'" 
                  class="w-5 h-5" 
                />
              </button>
            </div>

            <div class="mt-6">
              <div v-if="showNewInput" class="flex gap-2">
                <input 
                  v-model="newGroupName"
                  type="text"
                  placeholder="새 폴더 이름"
                  class="flex-1 h-12 bg-slate-800/50 border border-white/10 rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-brand-primary transition-all"
                  @keyup.enter="handleCreateGroup"
                />
                <button 
                  @click="handleCreateGroup"
                  :disabled="isCreatingGroup"
                  class="w-12 h-12 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20 disabled:opacity-50 transition-all"
                >
                  <UIcon v-if="isCreatingGroup" name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin" />
                  <UIcon v-else name="i-heroicons-plus-20-solid" class="w-6 h-6" />
                </button>
              </div>
              <button 
                v-else
                @click="showNewInput = true"
                class="w-full h-12 rounded-xl border border-dashed border-white/10 text-slate-500 text-xs font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                새 폴더 추가
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-10">
              <button 
                @click="$emit('update:open', false)"
                class="h-14 rounded-2xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-colors"
              >
                취소
              </button>
              <button 
                @click="handleSave"
                :disabled="saving"
                class="h-14 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <UIcon v-if="saving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
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
  stockId: number | null
  initialGroupIds?: number[]
}>()

const emit = defineEmits(['update:open', 'success'])

const { wishlistGroups, createWishlistGroup, isCreatingGroup, toggleHeart, fetchWishlist, wishlistsWithGroups } = useStock()
const toast = useToast()

const selectedGroupIds = ref<number[]>([])
const newGroupName = ref('')
const showNewInput = ref(false)
const saving = ref(false)

watch(() => props.open, (val) => {
  if (val) {
    selectedGroupIds.value = [...(props.initialGroupIds || [])]
    showNewInput.value = false
    newGroupName.value = ''
  }
})

const toggleSelection = (groupId: number) => {
  const idx = selectedGroupIds.value.indexOf(groupId)
  if (idx > -1) {
    selectedGroupIds.value.splice(idx, 1)
  } else {
    selectedGroupIds.value.push(groupId)
  }
}

const handleCreateGroup = async () => {
  const name = newGroupName.value.trim()
  if (!name) return
  
  const result = await createWishlistGroup(name)
  if (result.success) {
    newGroupName.value = ''
    showNewInput.value = false
    // 자동으로 새로 만든 폴더 선택
    if (result.data) {
      selectedGroupIds.value.push(result.data.id)
    }
  }
}

const handleSave = async () => {
  if (!props.stockId) {
    toast.add({ title: '종목 정보가 없습니다.', color: 'error' })
    return
  }
  
  saving.value = true
  try {
    // 현재 이 종목이 어떤 그룹들에 들어있는지 확인
    const currentGroups = wishlistsWithGroups.value
      .filter(w => w.stock_id === props.stockId)
      .map(w => w.group_id)
    
    // 추가해야 할 그룹
    const toAdd = selectedGroupIds.value.filter(id => id !== null && !currentGroups.includes(id))
    // 제거해야 할 그룹 (null 포함 기존 항목들 모두 체크)
    const toRemove = currentGroups.filter(id => !selectedGroupIds.value.includes(id as any))
    
    // 순차적으로 처리하여 낙관적 업데이트 충돌 방지
    for (const groupId of toAdd) {
      await toggleHeart(props.stockId!, groupId, { skipRefresh: true })
    }
    for (const groupId of toRemove) {
      // groupId가 null인 경우 toggleHeart 내부에서 기본 그룹으로 매핑되거나 처리됨
      await toggleHeart(props.stockId!, groupId as any, { skipRefresh: true })
    }
    
    // 모든 처리가 끝난 후 한 번만 최신 데이터 페치
    await fetchWishlist()
    
    toast.add({
      title: '변경사항이 저장되었습니다',
      color: 'primary',
      icon: 'i-heroicons-check-circle'
    })
    
    emit('success')
    emit('update:open', false)
  } catch (err: any) {
    console.error('[WishlistGroupModal] Save failed:', err)
    toast.add({
      title: '저장에 실패했습니다',
      description: err.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
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

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
