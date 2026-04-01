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
const { formatDate, formatTime } = useUtils()

// Middleware
definePageMeta({
  middleware: 'admin',
  layout: 'default'
})

// State
const pending = ref(false)
const batchLogs = ref<any[]>([])
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
  { id: 'update-krx-stocks', name: '주가 업데이트', isRunning: false }
])

// Functions
const fetchLogs = async () => {
  const { data } = await supabase
    .from('batch_execution_logs')
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(10)
  
  if (data) batchLogs.value = data
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

const refreshAll = async () => {
  pending.value = true
  await Promise.all([fetchLogs(), fetchStats()])
  pending.value = false
}

const runBatch = async (batch: any) => {
  batch.isRunning = true
  try {
    const { data, error } = await supabase.functions.invoke(batch.id)
    if (error) throw error
    alert(`${batch.name} 실행 완료!`)
    await refreshAll()
  } catch (err: any) {
    alert(`실패: ${err.message}`)
  } finally {
    batch.isRunning = false
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

