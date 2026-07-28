<template>
  <div class="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
    <!-- Decorative Glow -->
    <div class="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/10 blur-[150px] rounded-full"/>
    <div class="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-secondary/10 blur-[150px] rounded-full"/>

    <UContainer class="relative z-10">
      <header class="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-8 bg-brand-primary rounded-full"/>
            <h1 class="text-3xl font-black text-white tracking-tight">시스템 어드민</h1>
          </div>
          <p class="text-slate-400 font-medium">실시간 배치 현황 및 시스템 지표를 모니터링합니다.</p>
        </div>
        <div class="flex gap-3">
          <UButton
            icon="i-heroicons-document-text"
            color="neutral"
            variant="ghost"
            to="/_swagger"
            target="_blank"
            class="hover:bg-white/5"
          >
            API Docs
          </UButton>
          <UButton
            icon="i-heroicons-arrow-path"
            color="primary"
            class="shadow-lg shadow-brand-primary/20"
            :loading="pending"
            @click="refreshAll"
          >
            전체 새로고침
          </UButton>
        </div>
      </header>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div v-for="stat in systemStats" :key="stat.label" class="glass-dark p-6 rounded-3xl border border-white/10 group hover:border-brand-primary/30 transition-all">
          <div class="flex items-center gap-4">
            <div :class="[`p-4 rounded-2xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform text-white`, stat.gradient]">
              <UIcon :name="stat.icon" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{{ stat.label }}</p>
              <p class="text-2xl font-black text-white leading-none">{{ stat.value }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Accuracy Dashboard -->
      <div class="glass-dark p-6 rounded-3xl border border-white/10 mb-10">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <UIcon name="i-heroicons-chart-pie" class="text-brand-primary w-5 h-5" />
            AI 적중률 대시보드
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-bold">조회 기간</span>
            <select
              v-model="aiWindowDays"
              class="bg-slate-900/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-brand-primary/50"
            >
              <option :value="30">최근 30일</option>
              <option :value="90">최근 90일</option>
              <option :value="0">전체</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">총 추천(마감)</p>
            <p class="text-2xl font-black text-white">{{ aiSummary.total.toLocaleString() }}</p>
          </div>
          <div class="bg-white/5 border border-emerald-500/20 rounded-2xl p-4">
            <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">적중</p>
            <p class="text-2xl font-black text-emerald-400">{{ aiSummary.wins.toLocaleString() }}</p>
          </div>
          <div class="bg-white/5 border border-rose-500/20 rounded-2xl p-4">
            <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">실패</p>
            <p class="text-2xl font-black text-rose-400">{{ aiSummary.loses.toLocaleString() }}</p>
          </div>
          <div class="bg-white/5 border border-brand-primary/20 rounded-2xl p-4">
            <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">적중률</p>
            <p class="text-2xl font-black text-brand-primary">{{ aiSummary.winRate.toFixed(1) }}%</p>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b border-white/10">
              <p class="text-sm font-bold text-white">점수 구간별 적중률</p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="text-slate-400 bg-white/5 uppercase tracking-widest text-[10px]">
                  <tr>
                    <th class="px-4 py-3 text-left">구간</th>
                    <th class="px-4 py-3 text-right">표본</th>
                    <th class="px-4 py-3 text-right">적중</th>
                    <th class="px-4 py-3 text-right">적중률</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  <tr v-for="row in scoreBandRows" :key="row.label">
                    <td class="px-4 py-3 text-slate-200 font-bold">{{ row.label }}</td>
                    <td class="px-4 py-3 text-right text-slate-300">{{ row.total }}</td>
                    <td class="px-4 py-3 text-right text-emerald-400">{{ row.wins }}</td>
                    <td class="px-4 py-3 text-right font-black" :class="row.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'">
                      {{ row.winRate.toFixed(1) }}%
                    </td>
                  </tr>
                  <tr v-if="scoreBandRows.length === 0">
                    <td colspan="4" class="px-4 py-6 text-center text-slate-500">데이터가 없습니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b border-white/10">
              <p class="text-sm font-bold text-white">일자별 적중률 (최근 10영업일)</p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="text-slate-400 bg-white/5 uppercase tracking-widest text-[10px]">
                  <tr>
                    <th class="px-4 py-3 text-left">날짜</th>
                    <th class="px-4 py-3 text-right">표본</th>
                    <th class="px-4 py-3 text-right">적중</th>
                    <th class="px-4 py-3 text-right">적중률</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  <tr v-for="row in dailyTrendRows" :key="row.gameDate">
                    <td class="px-4 py-3 text-slate-200 font-bold">{{ row.gameDate }}</td>
                    <td class="px-4 py-3 text-right text-slate-300">{{ row.total }}</td>
                    <td class="px-4 py-3 text-right text-emerald-400">{{ row.wins }}</td>
                    <td class="px-4 py-3 text-right font-black" :class="row.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'">
                      {{ row.winRate.toFixed(1) }}%
                    </td>
                  </tr>
                  <tr v-if="dailyTrendRows.length === 0">
                    <td colspan="4" class="px-4 py-6 text-center text-slate-500">데이터가 없습니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Detailed Logs -->
      <div class="glass-dark p-6 rounded-3xl border border-white/10 mb-10">
        <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <UIcon name="i-heroicons-document-magnifying-glass" class="text-brand-secondary w-5 h-5" />
          AI 개별 종목 분석 내역
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th class="px-6 py-4">날짜</th>
                <th class="px-6 py-4">종목명</th>
                <th class="px-6 py-4 text-center">점수</th>
                <th class="px-6 py-4">결과</th>
                <th class="px-6 py-4 text-right">목표가</th>
                <th class="px-6 py-4">분석 근거</th>
                <th class="px-6 py-4 text-center">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="row in detailedAiRows" :key="row.id" class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">{{ row.game_date }}</td>
                <td class="px-6 py-4">
                  <div class="font-bold text-white">{{ row.stocks?.name }}</div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ row.stocks?.code }}</div>
                </td>
                <td class="px-6 py-4 text-center">
                  <UBadge 
                    :color="getScoreColor(row.ai_score)" 
                    variant="subtle" 
                    class="font-black rounded-lg"
                  >
                    {{ row.ai_score }}
                  </UBadge>
                </td>
                <td class="px-6 py-4">
                  <UBadge 
                    v-if="row.status === 'closed'"
                    :color="row.ai_result === 'win' ? 'primary' : row.ai_result === 'draw' ? 'neutral' : 'error'" 
                    variant="solid" 
                    class="rounded-lg font-bold text-[10px]"
                  >
                    {{ row.ai_result === 'win' ? '적중' : row.ai_result === 'draw' ? '무승부' : '실패' }}
                  </UBadge>
                  <span v-else class="text-xs text-slate-600 font-bold">진행중</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div v-if="row.target_price" class="flex flex-col items-end">
                    <span class="text-emerald-400 font-bold">{{ row.target_price.toLocaleString() }}</span>
                    <span class="text-[9px] text-slate-500">{{ row.target_date }}</span>
                  </div>
                  <span v-else class="text-slate-600">-</span>
                </td>
                <td class="px-6 py-4">
                  <p class="text-xs text-slate-300 leading-relaxed max-w-md line-clamp-2 hover:line-clamp-none transition-all cursor-help">
                    {{ row.ai_reasoning || row.llm_summary || '분석 정보 없음' }}
                  </p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <UButton
                      v-if="row.status === 'pending'"
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-heroicons-arrow-path"
                      :loading="recheckingState[row.id]"
                      @click="handleReCheck(row)"
                    >
                      검증
                    </UButton>
                    <UButton
                      v-if="row.status === 'pending'"
                      size="xs"
                      color="error"
                      variant="soft"
                      icon="i-heroicons-x-mark"
                      @click="handleWithdraw(row)"
                    >
                      해제
                    </UButton>
                    <UBadge v-else-if="row.status === 'withdrawn'" color="error" variant="subtle" class="rounded-lg font-bold text-[10px]">
                      추천 해제됨
                    </UBadge>
                  </div>
                </td>
              </tr>
              <tr v-if="detailedAiRows.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-slate-500 italic">내역이 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Batch Management & Execution Logs -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Batch List (Execution) -->
        <div class="lg:col-span-1 space-y-6">
          <div class="glass-dark p-6 rounded-3xl border border-white/10">
            <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <UIcon name="i-heroicons-cpu-chip" class="text-brand-secondary w-5 h-5" />
              배치 수동 실행
            </h3>
            <div class="space-y-3">
              <div v-for="batch in batchFunctions" :key="batch.id" class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group">
                <div>
                  <p class="text-sm font-bold text-white">{{ batch.name }}</p>
                  <p class="text-[10px] text-slate-500 font-medium">{{ batch.id }}</p>
                </div>
                <UButton
                  size="xs"
                  variant="soft"
                  :color="batch.isRunning ? 'primary' : 'neutral'"
                  :loading="batch.isRunning"
                  class="font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="runBatch(batch)"
                >
                  실행
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Execution History -->
        <div class="lg:col-span-2">
          <div class="glass-dark rounded-3xl border border-white/10 overflow-hidden">
            <div class="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <UIcon name="i-heroicons-list-bullet" class="text-brand-primary w-5 h-5" />
                최근 배치 실행 이력
              </h3>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th class="px-6 py-4">함수명</th>
                    <th class="px-6 py-4">상태</th>
                    <th class="px-6 py-4 text-right">처리건수</th>
                    <th class="px-6 py-4 text-right">실행시간</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  <tr v-for="log in batchLogs" :key="log.id" class="hover:bg-white/5 transition-colors">
                    <td class="px-6 py-4 font-bold text-white">{{ log.function_name }}</td>
                    <td class="px-6 py-4">
                      <UBadge 
                        :color="log.status === 'success' ? 'primary' : 'error'" 
                        variant="subtle" 
                        class="rounded-lg font-bold text-[10px]"
                      >
                        {{ log.status === 'success' ? '성공' : '실패' }}
                      </UBadge>
                    </td>
                    <td class="px-6 py-4 text-right font-mono text-slate-400">{{ log.processed_count || 0 }}</td>
                    <td class="px-6 py-4 text-right text-xs text-slate-500">{{ formatTime(log.finished_at) }}</td>
                  </tr>
                  <tr v-if="batchLogs.length === 0">
                    <td colspan="4" class="px-6 py-12 text-center text-slate-500 italic">이력이 없습니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </UContainer>

    <!-- Re-check Result Modal -->
    <UModal v-model="isReCheckModalOpen">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-white/10', background: 'bg-slate-900' } as any">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-white">추천 유효성 검증 결과</h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="isReCheckModalOpen = false" />
          </div>
        </template>

        <div v-if="reCheckResult" class="space-y-4 py-2">
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p class="text-xs text-slate-500 mb-1">상태 판단</p>
              <UBadge 
                :color="reCheckResult.judgment === 'STAY' ? 'primary' : 'error'" 
                variant="solid" 
                class="font-black px-3 py-1 rounded-lg"
              >
                {{ reCheckResult.judgment === 'STAY' ? '추천 유지 권고' : '추천 철회 권고' }}
              </UBadge>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500 mb-1">신규 AI 점수</p>
              <p class="text-2xl font-black" :class="getScoreColor(reCheckResult.new_score)">{{ reCheckResult.new_score }}</p>
            </div>
          </div>

          <div>
            <p class="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">AI 분석 의견</p>
            <div class="p-4 rounded-xl bg-slate-950 border border-white/10 text-sm text-slate-200 leading-relaxed">
              {{ reCheckResult.reason }}
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isReCheckModalOpen = false">닫기</UButton>
            <UButton 
              v-if="reCheckResult?.judgment === 'WITHDRAW'" 
              color="error" 
              @click="handleWithdraw({ id: reCheckResult.daily_id, stocks: { name: reCheckResult.stock_name } }); isReCheckModalOpen = false"
            >
              추천 즉시 해제
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const { formatTime } = useUtils()

// Middleware
definePageMeta({
  middleware: 'admin',
  layout: 'default'
})

// 대시보드 데이터 계층 (배치 로그·시스템 통계·AI 성과 집계)
const {
  pending,
  batchLogs,
  aiWindowDays,
  detailedAiRows,
  systemStats,
  aiSummary,
  scoreBandRows,
  dailyTrendRows,
  fetchAiDashboard,
  refreshAll
} = useAdminDashboard()

const { reEvaluateRecommendation, withdrawRecommendation } = useStock()
const recheckingState = ref<Record<string, boolean>>({})
const reCheckResult = ref<any>(null)
const isReCheckModalOpen = ref(false)

const batchFunctions = ref([
  { id: 'calculate-rankings', name: '랭킹 정산', isRunning: false },
  { id: 'fetch-market-news-periodically', name: '시장 뉴스 수집', isRunning: false },
  { id: 'process-daily-results', name: '결과 판정', isRunning: false },
  { id: 'select-daily-stocks', name: '종목 선정', isRunning: false },
  { id: 'update-krx-stocks', name: '주가 업데이트', isRunning: false },
  { id: 'update-krx-top-100', name: 'KRX Top 100 갱신', isRunning: false }
])

// Functions
const toast = useToast()

const getScoreColor = (score: number) => {
  if (score >= 80) return 'primary'
  if (score >= 60) return 'success'
  if (score >= 40) return 'neutral'
  return 'error'
}

const runBatch = async (batch: any) => {
  batch.isRunning = true
  try {
    const { error } = await supabase.functions.invoke(batch.id)
    if (error) throw error
    toast.add({
      title: '배치 실행 완료',
      description: `${batch.name}이(가) 성공적으로 실행되었습니다.`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    await refreshAll()
  } catch (err: any) {
    toast.add({
      title: '배치 실행 실패',
      description: `${batch.name} 실행 중 오류가 발생했습니다: ${err.message}`,
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    batch.isRunning = false
  }
}

const handleReCheck = async (row: any) => {
  recheckingState.value[row.id] = true
  try {
    const res = await reEvaluateRecommendation(row.id)
    if (res.success) {
      reCheckResult.value = res.data
      isReCheckModalOpen.value = true
    } else {
      toast.add({ title: '검증 실패', description: res.message, color: 'error' })
    }
  } finally {
    recheckingState.value[row.id] = false
  }
}

const handleWithdraw = async (row: any) => {
  if (!confirm(`${row.stocks?.name}의 추천을 해제하시겠습니까? 메인 화면에서 더 이상 노출되지 않습니다.`)) return
  
  const res = await withdrawRecommendation(row.id)
  if (res.success) {
    toast.add({ title: '추천 해제 완료', color: 'success' })
    await fetchAiDashboard()
  } else {
    toast.add({ title: '추천 해제 실패', description: res.message, color: 'error' })
  }
}

// Initial Fetch
onMounted(() => {
  refreshAll()
})

</script>

<style scoped>
.glass-dark {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
}
</style>

