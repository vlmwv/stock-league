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
          <NuxtLink to="/daily-history" class="w-10 h-10 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-brand-primary transition-all active:scale-95 shadow-sm">
            <UIcon name="i-heroicons-clock" class="w-5 h-5" />
          </NuxtLink>
        </div>
        <p class="text-sm font-medium mt-3" :class="isLeagueOpen ? 'text-brand-primary/90' : (statusMessage.includes('준비 중') ? 'text-orange-400' : 'text-slate-500')">
          {{ statusMessage }}
        </p>
      </header>

      <!-- Stock List -->
      <section class="space-y-4">
        <div 
          v-for="stock in dailyStocks" 
          :key="stock.id"
          @click="navigateTo('/stocks/' + stock.code)"
          class="glass-dark rounded-3xl p-6 border border-white/5 relative overflow-hidden group transition-all duration-300 cursor-pointer hover:bg-white/5"
          :class="getPredictionValue(stock.id) === 'up' ? 'border-rose-500/30' : getPredictionValue(stock.id) === 'down' ? 'border-indigo-500/30' : ''"
        >
          <!-- Representative Background Image -->
          <div class="absolute inset-0 z-0 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700">
            <img 
              :src="getStockImage(stock.code, stock.sector)" 
              class="w-full h-full object-cover grayscale scale-110 group-hover:scale-125 transition-transform duration-[2s]"
              alt=""
            />
            <div class="absolute inset-0 bg-gradient-to-br from-bg-deep/90 via-transparent to-bg-deep/95"></div>
          </div>

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
                  
                  <!-- AI Insight (Simple & Intuitive) -->
                  <div v-if="stock.ai_score || stock.ai_recommendation_count > 0" class="flex items-center gap-3 mb-1.5">
                    <div v-if="stock.ai_score" class="flex flex-col items-center">
                      <span class="text-xs font-black text-slate-100 border-b-2 border-double border-brand-primary leading-none pb-0.5">
                        {{ stock.ai_score }}P
                      </span>
                      <span class="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">AI Score</span>
                    </div>

                    <div v-if="stock.ai_recommendation_count > 0" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20">
                      <UIcon name="i-heroicons-hand-thumb-up-20-solid" class="w-3 h-3 text-brand-primary" />
                      <span class="text-[9px] font-black text-brand-primary uppercase tracking-tighter">{{ stock.ai_recommendation_count }} Pick</span>
                    </div>
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
              @click.stop="toggleHeart(stock.id)"
              class="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-all bg-slate-800/50 border border-white/5"
              :class="isHearted(stock.id) ? 'text-rose-500' : 'text-slate-600'"
            >
              <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
            </button>
          </div>

          <div v-if="!isLeagueOpen" class="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
            <span class="px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-black text-slate-400 uppercase tracking-widest shadow-2xl">
              {{ (getKstDate() === stock.game_date && getKstTimeVal() >= 2120) ? '내일 종목 준비 중' : '응모 마감' }}
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
  </div>
</template>

<script setup lang="ts">
import { getStockImage } from '~/utils/stock'

const { dailyStocks, hearts, myPredictions, refresh, fetchWishlist, fetchPredictions, toggleHeart, predict, isLeagueOpen, isResultPublished, allPredicted, isHearted, getPrediction, getPredictionValue } = useStock()

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
