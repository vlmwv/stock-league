<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <div class="absolute inset-0" @click="$emit('update:open', false)"></div>
        
        <div class="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden transform transition-all duration-300 scale-100 my-auto">
          <div class="px-8 py-10">
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary">
                  <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="text-2xl font-black text-white tracking-tight">추천 등록</h3>
                  <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{{ stockName }} ({{ stockCode }})</p>
                </div>
              </div>
              <button @click="$emit('update:open', false)" class="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-6 h-6" />
              </button>
            </div>
            
            <div class="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <!-- AI Score & Game Date -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">추천 점수 (0~100)</label>
                  <input 
                    v-model="form.ai_score"
                    type="number"
                    min="0"
                    max="100"
                    class="w-full h-12 bg-slate-800/50 border border-white/10 rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">추천 적용일 (YYYY-MM-DD)</label>
                  <input 
                    v-model="form.game_date"
                    type="text"
                    placeholder="YYYY-MM-DD"
                    class="w-full h-12 bg-slate-800/50 border border-white/10 rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-brand-primary transition-all font-mono"
                  />
                </div>
              </div>

              <!-- Summary -->
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">핵심 요약 (50자 이내)</label>
                <input 
                  v-model="form.summary"
                  type="text"
                  placeholder="예: 실적 개선 기대감에 따른 기술적 반등 유효"
                  class="w-full h-12 bg-slate-800/50 border border-white/10 rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-brand-primary transition-all"
                />
              </div>

              <!-- Reasoning -->
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">상세 분석 근거</label>
                <textarea 
                  v-model="form.reasoning"
                  rows="4"
                  placeholder="상세 분석 내용을 입력하세요."
                  class="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-brand-primary transition-all resize-none"
                ></textarea>
              </div>

              <!-- Target Price & Date -->
              <div class="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 space-y-5">
                <p class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Target Info (목표 설정)</p>
                
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">🎯 목표가 (원)</label>
                    <input 
                      v-model="form.target_price"
                      type="number"
                      class="w-full h-12 bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">📅 목표일 (YYYY-MM-DD)</label>
                    <input 
                      v-model="form.target_date"
                      type="text"
                      placeholder="YYYY-MM-DD"
                      class="w-full h-12 bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
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
                @click="handleSave"
                :disabled="loading"
                class="h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <UIcon v-if="loading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                추천 등록하기
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
  stockName: string
  stockCode: string
  lastPrice: number
}>()

const emit = defineEmits(['update:open', 'success'])

const { createRecommendation } = useStock()
const toast = useToast()

const loading = ref(false)

const getInitialForm = () => {
  const today = new Date().toISOString().split('T')[0]
  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
  const targetDate = threeMonthsLater.toISOString().split('T')[0]

  return {
    ai_score: 80,
    game_date: today,
    summary: '',
    reasoning: '',
    target_price: Math.round(props.lastPrice * 1.2 / 100) * 100, // 기본 +20%
    target_date: targetDate
  }
}

const form = ref(getInitialForm())

watch(() => props.open, (val) => {
  if (val) {
    form.value = getInitialForm()
  }
})

const handleSave = async () => {
  if (!props.stockId) return
  
  if (!form.value.summary) {
    toast.add({ title: '요약 내용을 입력해주세요.', color: 'error' })
    return
  }

  loading.value = true
  try {
    const res = await createRecommendation(props.stockId, {
      ai_score: Number(form.value.ai_score),
      summary: form.value.summary,
      reasoning: form.value.reasoning,
      target_price: Number(form.value.target_price),
      target_date: form.value.target_date,
      game_date: form.value.game_date
    })

    if (res.success) {
      toast.add({
        title: '추천이 성공적으로 등록되었습니다',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })
      emit('success')
      emit('update:open', false)
    } else {
      toast.add({
        title: '등록에 실패했습니다',
        description: res.message,
        color: 'error'
      })
    }
  } finally {
    loading.value = false
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
