<template>
  <div class="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
    <!-- Decorative Glow -->
    <div class="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/10 blur-[150px] rounded-full"></div>
    <div class="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-secondary/10 blur-[150px] rounded-full"></div>

    <UContainer class="relative z-10">
      <header class="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-8 bg-brand-primary rounded-full"></div>
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
                  @click="runBatch(batch)"
                  class="font-bold opacity-0 group-hover:opacity-100 transition-opacity"
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

// State
const pending = ref(false)
const batchLogs = ref<any[]>([])
const aiWindowDays = ref(90)
const aiRows = ref<any[]>([])
const systemStats = ref([
  { label: '전체 사용자', value: '0', icon: 'i-heroicons-users', gradient: 'from-blue-500 to-cyan-400' },
  { label: '오늘의 예측', value: '0', icon: 'i-heroicons-chart-bar', gradient: 'from-green-500 to-emerald-400' },
  { label: '활성 종목', value: '0', icon: 'i-heroicons-banknotes', gradient: 'from-orange-500 to-yellow-400' },
  { label: '최근 이슈', value: '0건', icon: 'i-heroicons-megaphone', gradient: 'from-purple-500 to-indigo-400' }
])

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
const fetchLogs = async () => {
  const { data } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(10)
  
  if (data) batchLogs.value = data
}

const getWindowStartDate = (days: number) => {
  if (days <= 0) return null
  const now = new Date()
  now.setDate(now.getDate() - days)
  return now.toISOString().slice(0, 10)
}

const fetchAiDashboard = async () => {
  let query = supabase
    .from('daily_stocks')
    .select('game_date, ai_score, ai_result, status')
    .eq('status', 'closed')
    .in('ai_result', ['win', 'lose', 'draw'])
    .order('game_date', { ascending: false })

  const startDate = getWindowStartDate(aiWindowDays.value)
  if (startDate) {
    query = query.gte('game_date', startDate)
  }

  const { data, error } = await query.limit(5000)
  if (error) {
    console.error('[admin] Failed to fetch AI dashboard data:', error.message)
    aiRows.value = []
    return
  }

  aiRows.value = data || []
}

const fetchStats = async () => {
  // 실제 통계 데이터 조회 로직 (예시)
  const [{ count: userCount }, { count: predCount }, { count: stockCount }, { count: newsCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase.from('stocks').select('*', { count: 'exact', head: true }),
    supabase.from('news').select('*', { count: 'exact', head: true })
  ])

  systemStats.value[0]!.value = (userCount || 0).toLocaleString()
  systemStats.value[1]!.value = (predCount || 0).toLocaleString()
  systemStats.value[2]!.value = (stockCount || 0).toLocaleString()
  systemStats.value[3]!.value = (newsCount || 0).toLocaleString() + '건'
}

const aiSummary = computed(() => {
  const rows = aiRows.value
  const total = rows.length
  const wins = rows.filter(r => r.ai_result === 'win').length
  const loses = rows.filter(r => r.ai_result === 'lose').length
  const draws = rows.filter(r => r.ai_result === 'draw').length
  const winRate = total > 0 ? (wins / total) * 100 : 0
  return { total, wins, loses, draws, winRate }
})

const scoreBandRows = computed(() => {
  const bands = [
    { label: '0 ~ 39', min: 0, max: 39 },
    { label: '40 ~ 49', min: 40, max: 49 },
    { label: '50 ~ 59', min: 50, max: 59 },
    { label: '60 ~ 69', min: 60, max: 69 },
    { label: '70 ~ 100', min: 70, max: 100 }
  ]

  return bands.map((band) => {
    const bandRows = aiRows.value.filter((row) => {
      const score = Number(row.ai_score ?? 0)
      return score >= band.min && score <= band.max
    })
    const total = bandRows.length
    const wins = bandRows.filter(r => r.ai_result === 'win').length
    const winRate = total > 0 ? (wins / total) * 100 : 0
    return { label: band.label, total, wins, winRate }
  })
})

const dailyTrendRows = computed(() => {
  const grouped = new Map<string, { total: number, wins: number }>()
  for (const row of aiRows.value) {
    const key = row.game_date
    const prev = grouped.get(key) || { total: 0, wins: 0 }
    prev.total += 1
    if (row.ai_result === 'win') prev.wins += 1
    grouped.set(key, prev)
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] < b[0] ? 1 : -1)
    .slice(0, 10)
    .map(([gameDate, value]) => ({
      gameDate,
      total: value.total,
      wins: value.wins,
      winRate: value.total > 0 ? (value.wins / value.total) * 100 : 0
    }))
})

const refreshAll = async () => {
  pending.value = true
  await Promise.all([fetchLogs(), fetchStats(), fetchAiDashboard()])
  pending.value = false
}

const runBatch = async (batch: any) => {
  batch.isRunning = true
  try {
    const { data, error } = await supabase.functions.invoke(batch.id)
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

// Initial Fetch
onMounted(() => {
  refreshAll()
})

watch(aiWindowDays, () => {
  fetchAiDashboard()
})
</script>

<style scoped>
.glass-dark {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
}
</style>

