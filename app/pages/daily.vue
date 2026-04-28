<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader @open-guide="isGuideOpen = true" />
    <LeagueGuide :is-open="isGuideOpen" @close="isGuideOpen = false" />

    <main class="max-w-md mx-auto px-6 py-8">
      <header class="mb-8">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Today's League</span>
        </div>
        <h2 class="text-3xl font-black text-slate-100 tracking-tight leading-tight">
          {{ isTomorrow ? '내일의' : '오늘의' }} <span class="text-brand-primary">예측 리그</span>
        </h2>
        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md border border-white/5">
              League Date: {{ gameDateDisplay }}
            </span>
          </div>
          <div class="flex items-center gap-2">

            <NuxtLink to="/ai?sub=history" class="w-10 h-10 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-brand-primary transition-all active:scale-95 shadow-sm">
              <UIcon name="i-heroicons-clock" class="w-5 h-5" />
            </NuxtLink>
          </div>
        </div>
        <p class="text-sm font-medium mt-3" :class="isLeagueOpen ? 'text-brand-primary/90' : (statusMessage.includes('준비 중') ? 'text-orange-400' : 'text-slate-500')">
          {{ statusMessage }}
        </p>
      </header>


      <!-- Loading State -->
      <section v-if="pending && dailyStocks.length === 0" class="space-y-4">
        <div v-for="i in 3" :key="i" class="glass-dark rounded-3xl p-6 border border-white/5 animate-pulse">
          <div class="flex justify-between items-start mb-4">
            <div class="flex gap-4 flex-1">
              <div class="w-12 h-12 rounded-2xl bg-white/5"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 w-16 bg-white/5 rounded"></div>
                <div class="h-6 w-32 bg-white/5 rounded"></div>
              </div>
            </div>
            <div class="w-16 h-8 bg-white/5 rounded-lg"></div>
          </div>
          <div class="h-16 w-full bg-white/5 rounded-2xl mb-6"></div>
          <div class="flex gap-3">
            <div class="flex-1 h-14 rounded-2xl bg-white/5"></div>
            <div class="flex-1 h-14 rounded-2xl bg-white/5"></div>
            <div class="w-12 h-12 rounded-2xl bg-white/5"></div>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <section v-else-if="!pending && dailyStocks.length === 0" class="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div class="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-white/5">
          <UIcon name="i-heroicons-face-frown" class="w-10 h-10 text-slate-500" />
        </div>
        <h3 class="text-xl font-black text-slate-100 mb-2">데이터가 없습니다</h3>
        <p class="text-sm text-slate-500 leading-relaxed mb-8">
          리그 데이터를 불러오지 못했습니다.<br>잠시 후 다시 시도해 주세요.
        </p>
        <button 
          @click="refresh"
          class="px-6 py-3 rounded-xl bg-brand-primary text-slate-900 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
        >
          다시 시도하기
        </button>
      </section>

      <!-- Stock List -->
      <section v-else class="space-y-4">
        <div 
          v-for="stock in dailyStocks" 
          :key="stock.id"
          @click="navigateTo('/stocks/' + stock.code)"
          class="glass-dark rounded-3xl p-6 border border-white/5 relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-white/5"
          :class="getPredictionValue(stock.id) === 'up' ? 'border-rose-500/30' : getPredictionValue(stock.id) === 'down' ? 'border-indigo-500/30' : ''"
        >
          <!-- 예측 완료 배지 -->

          <div v-if="getPrediction(stock.id)" class="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm"
            :class="[
              getPrediction(stock.id)?.result === 'win' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              getPrediction(stock.id)?.result === 'lose' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
              getPrediction(stock.id)?.result === 'draw' ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' :
              getPrediction(stock.id)?.prediction === 'up' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
            ]"
          >
            <UIcon 
              :name="getPrediction(stock.id)?.result === 'win' ? 'i-heroicons-sparkles' : (getPrediction(stock.id)?.result === 'lose' ? 'i-heroicons-x-circle' : (getPrediction(stock.id)?.result === 'draw' ? 'i-heroicons-minus-circle' : 'i-heroicons-check-circle-20-solid'))" 
              class="w-3.5 h-3.5" 
            />
            {{ 
              getPrediction(stock.id)?.result === 'win' ? '예측 성공' : 
              getPrediction(stock.id)?.result === 'lose' ? '예측 실패' : 
              getPrediction(stock.id)?.result === 'draw' ? '무승부' :
              (getPrediction(stock.id)?.prediction === 'up' ? '상승 선택됨' : '하락 선택됨') 
            }}
          </div>

          <div class="flex justify-between items-start mb-4">
            <div class="flex gap-4 flex-1">
              <StockIcon :code="stock.code" :name="stock.name" size="md" />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{{ stock.code }}</span>
                  
                  <!-- AI Insight (Compact) -->
                  <div v-if="stock.ai_score || stock.ai_recommendation_count > 0" class="flex items-center gap-1.5 ml-1">
                    <span v-if="stock.ai_score" class="text-[9px] font-black text-emerald-400 bg-emerald-400/5 px-1.5 py-0.5 rounded border border-emerald-400/10 leading-none">{{ stock.ai_score }}점</span>
                    <span v-if="stock.ai_recommendation_count > 0" class="text-[9px] font-black text-brand-primary bg-brand-primary/5 px-1.5 py-0.5 rounded border border-brand-primary/10 leading-none">{{ stock.ai_recommendation_count }}회</span>
                  </div>

                  <div 
                    v-if="isResultPublished && (stock as any).ai_result && (stock as any).ai_result !== 'pending'" 
                    class="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border shadow-sm"
                    :class="[
                      (stock as any).ai_result === 'win' ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' : 
                      (stock as any).ai_result === 'lose' ? 'bg-rose-400/10 border-rose-400/20 text-rose-400' : 
                      'bg-slate-400/10 border-slate-400/20 text-slate-400'
                    ]"
                  >
                    <span class="text-[10px] font-black leading-none">AI {{ (stock as any).ai_result === 'win' ? '성공' : ((stock as any).ai_result === 'lose' ? '실패' : '무승부') }}</span>
                  </div>
                </div>
                <h4 class="text-xl font-black text-slate-100">{{ stock.name }}</h4>
              </div>
            </div>
            <div class="text-right" :class="getPrediction(stock.id) ? 'mt-5' : ''">
              <div class="text-lg font-black text-slate-100">
                {{ stock.last_price.toLocaleString() }}
              </div>
              <div 
                class="text-[10px] font-bold"
                :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'"
              >
                {{ stock.change_amount >= 0 ? '+' : '' }}{{ stock.change_amount.toLocaleString() }} ({{ stock.change_rate }}%)
              </div>
            </div>
          </div>

          <!-- Summary -->
          <p class="text-xs text-slate-400 leading-relaxed italic mb-6 line-clamp-3">
            "{{ stock.summary }}"
          </p>

          <!-- Target Info -->
          <div v-if="stock.target_price" class="flex items-center gap-4 mb-6 px-4 py-3 bg-slate-800/30 rounded-2xl border border-white/5">
            <div class="flex-1">
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">목표가</p>
              <p class="text-sm font-black text-emerald-400">{{ stock.target_price.toLocaleString() }}원</p>
            </div>
            <div class="flex-1 text-right">
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">목표기준일</p>
              <p class="text-sm font-black text-slate-300">{{ stock.target_date }}</p>
            </div>
          </div>

          <!-- Prediction Controls -->
          <div class="flex items-center gap-3 mt-auto">
            <button 
              @click.stop="onPredict(stock.id, 'up')"
              :disabled="!isLeagueOpen"
              class="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden"
              :class="[
                getPredictionValue(stock.id) === 'up'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-400 ring-offset-2 ring-offset-transparent scale-[1.02]'
                  : getPredictionValue(stock.id) === 'down'
                    ? 'bg-slate-800/30 text-slate-600 border border-white/5 opacity-40'
                    : 'bg-slate-800/50 text-rose-500/80 border border-rose-500/20 hover:bg-rose-500/10',
                !isLeagueOpen && getPredictionValue(stock.id) !== 'up' ? 'opacity-20 grayscale cursor-not-allowed' : '',
                !isLeagueOpen && getPredictionValue(stock.id) === 'up' ? 'opacity-90 cursor-default' : ''
              ]"
            >
              <UIcon 
                :name="getPredictionValue(stock.id) === 'up' ? 'i-heroicons-check-circle-20-solid' : 'i-heroicons-arrow-trending-up-20-solid'" 
                class="w-5 h-5" 
              />
              <span class="text-xs font-black uppercase tracking-widest">
                {{ getPredictionValue(stock.id) === 'up' ? '상승 ✓' : '상승' }}
              </span>
            </button>
            <button 
              @click.stop="onPredict(stock.id, 'down')"
              :disabled="!isLeagueOpen"
              class="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 relative overflow-hidden"
              :class="[
                getPredictionValue(stock.id) === 'down'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent scale-[1.02]'
                  : getPredictionValue(stock.id) === 'up'
                    ? 'bg-slate-800/30 text-slate-600 border border-white/5 opacity-40'
                    : 'bg-slate-800/50 text-indigo-500/80 border border-indigo-500/20 hover:bg-indigo-500/10',
                !isLeagueOpen && getPredictionValue(stock.id) !== 'down' ? 'opacity-20 grayscale cursor-not-allowed' : '',
                !isLeagueOpen && getPredictionValue(stock.id) === 'down' ? 'opacity-90 cursor-default' : ''
              ]"
            >
              <UIcon 
                :name="getPredictionValue(stock.id) === 'down' ? 'i-heroicons-check-circle-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" 
                class="w-5 h-5" 
              />
              <span class="text-xs font-black uppercase tracking-widest">
                {{ getPredictionValue(stock.id) === 'down' ? '하락 ✓' : '하락' }}
              </span>
            </button>
            <button 
              @click.stop="handleOpenModal(stock.id)"
              class="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-all bg-slate-800/50 border border-white/5 shadow-2xl"
              :class="isHearted(stock.id) ? 'text-rose-500 shadow-rose-500/10' : 'text-slate-600'"
            >
              <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
            </button>
          </div>

          <div v-if="!isLeagueOpen" class="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
            <span class="px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-black text-slate-400 uppercase tracking-widest shadow-2xl">
              {{ (getKstDate() === (stock as any).game_date && getKstTimeVal() >= 2120) ? '내일 종목 준비 중' : '응모 마감' }}
            </span>
          </div>

          <!-- 변경 힌트 -->
          <p v-if="getPrediction(stock.id)" class="text-center text-[10px] text-slate-600 mt-3 font-medium">
            {{ isLeagueOpen ? '탭해서 예측을 변경할 수 있어요' : '마감되어 예측을 변경할 수 없습니다' }}
          </p>
        </div>
      </section>

    </main>

    
    <BottomNav />
    
    <WishlistGroupModal 
      v-model:open="isGroupModalOpen"
      :stock-id="selectedStockId"
      :initial-group-ids="currentStockGroupIds"
    />
  </div>
</template>

<script setup lang="ts">


const { 
  dailyStocks, 
  hearts, 
  myPredictions, 
  refresh, 
  pending,
  fetchWishlist, 
  fetchPredictions, 
  toggleHeart, 
  predict, 
  isLeagueOpen, 
  isResultPublished, 
  allPredicted, 
  isHearted, 
  getPrediction, 
  getPredictionValue,
  wishlistsWithGroups
} = useStock()

const isGroupModalOpen = ref(false)
const selectedStockId = ref<number | null>(null)
const currentStockGroupIds = computed(() => {
  if (!selectedStockId.value) return []
  return wishlistsWithGroups.value
    .filter(w => w.stock_id === selectedStockId.value)
    .map(w => w.group_id)
})

const handleOpenModal = (id: number) => {
  selectedStockId.value = id
  isGroupModalOpen.value = true
}

const getKstDate = () => {
  const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
  return new Intl.DateTimeFormat('sv-SE', options).format(new Date())
}

const kstTime = useState<{ hour: number, minute: number, timeVal: number }>('kst_time')
const getKstTimeVal = () => kstTime.value?.timeVal || 0

const isTomorrow = computed(() => {
  const firstStock = dailyStocks.value?.[0]
  if (!firstStock) return false
  return (firstStock as any).game_date > getKstDate()
})

const gameDateDisplay = computed(() => {
  const firstStock = dailyStocks.value?.[0]
  if (!firstStock) return '-'
  return (firstStock as any).game_date
})

const statusMessage = computed(() => {
  const firstStock = dailyStocks.value?.[0]
  if (!firstStock) return '데이터를 불러오는 중...'
  
  const today = getKstDate()
  const gameDate = (firstStock as any).game_date
  const timeVal = getKstTimeVal()
  
  if (gameDate > today) {
    if (isLeagueOpen.value) {
      return '내일의 종목 응모가 시작되었습니다! 지금 바로 참여해 보세요.'
    } else {
      return '응모 시간이 아닙니다. 다음 종목 응모는 21:20분부터 가능합니다.'
    }
  } else if (gameDate === today) {
    if (isLeagueOpen.value) {
      return '오늘의 5종목을 예측해 보세요.'
    } else {
      if (timeVal >= 2120) {
        return allPredicted.value ? '내일 리그 응모를 완료했습니다! 결과 발표를 기다려 주세요.' : '내일의 리그 종목을 준비 중입니다. 잠시만 기다려 주세요.'
      }
      return allPredicted.value ? '오늘의 예측을 완료했습니다! 결과 발표를 기다려 주세요.' : '오늘의 예측이 마감되었습니다. 다음 종목 응모는 21시 20분부터 진행할 수 있습니다.'
    }
  } else {
    return '해당 날짜의 리그가 종료되었습니다.'
  }
})
const isGuideOpen = ref(false)

const onPredict = async (id: number, prediction: 'up' | 'down') => {
  if (!isLeagueOpen.value) return
  
  const stock = dailyStocks.value.find(s => s.id === id)
  if (stock) {
    await predict(id, prediction, stock.game_date)
  }
}

onMounted(async () => {
  await Promise.all([
    refresh(),
    fetchWishlist()
  ])
  
  // 종목 데이터가 로드된 후, 해당 종목들의 game_date를 기준으로 예측 데이터를 조회합니다.
  // 21:20 이후 '내일의 리그'인 경우 내일 날짜의 예측을 가져오기 위함입니다.
  const targetDate = dailyStocks.value?.[0]?.game_date
  await fetchPredictions(targetDate)
})
</script>

<style scoped>
.animate-scale-in {
  animation: scale-in 0.5s cubic-bezier(0.2, 0, 0.2, 1);
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
