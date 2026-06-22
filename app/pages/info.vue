<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

    <main class="max-w-md mx-auto">
      <!-- 탭 스위처 (주식 정보 / 최신 뉴스 / 경제 지표) -->
      <section class="px-4 pt-6 mb-6">
        <div class="flex p-1 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl">
          <button 
            class="flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-1"
            :class="activeTab === 'stock' ? 'bg-slate-800 text-brand-primary shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'"
            @click="activeTab = 'stock'"
          >
            <UIcon name="i-heroicons-chart-pie" class="w-4 h-4" />
            주식 정보
          </button>
          <button 
            class="flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-1"
            :class="activeTab === 'news' ? 'bg-slate-800 text-slate-100 shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'"
            @click="activeTab = 'news'"
          >
            <UIcon name="i-heroicons-newspaper" class="w-4 h-4" />
            최신 뉴스
          </button>
          <button 
            class="flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-1"
            :class="activeTab === 'indicators' ? 'bg-slate-800 text-slate-100 shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'"
            @click="activeTab = 'indicators'"
          >
            <UIcon name="i-heroicons-calendar-days" class="w-4 h-4" />
            경제 지표
          </button>
        </div>
      </section>

      <!-- 1. 주식 정보 탭 -->
      <section v-if="activeTab === 'stock'" class="px-4 space-y-8 animate-fade-in pb-10">


        <!-- 2. 오늘의 탐욕·공포 지수 (Fear & Greed Index) -->
        <div class="glass-dark rounded-[1.75rem] p-5 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-white/5 pb-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-indigo-400" />
              <div class="flex flex-col">
                <h3 class="text-sm font-black text-slate-100 tracking-tight">오늘의 탐욕·공포 지수</h3>
                <span class="text-[9px] font-bold text-slate-500">시장 심리 과열도 측정기</span>
              </div>
            </div>
            <!-- 5단계 뱃지 -->
            <span 
              class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border transition-all duration-300"
              :class="fearGreedStatus.colorClass"
            >
              {{ fearGreedStatus.label }}
            </span>
          </div>

          <!-- 게이지바 레이아웃 -->
          <div class="flex items-center justify-center py-2 relative">
            <div class="w-48 h-28 relative">
              <svg class="w-full h-full" viewBox="0 0 200 120">
                <!-- 회색 배경 트랙 -->
                <path 
                  d="M 20 100 A 80 80 0 0 1 180 100" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.05)" 
                  stroke-width="12" 
                  stroke-linecap="round"
                />
                <!-- 컬러 게이지 (값에 매핑) -->
                <path 
                  d="M 20 100 A 80 80 0 0 1 180 100" 
                  fill="none" 
                  :stroke="fearGreedStatus.gaugeColor" 
                  stroke-width="12" 
                  stroke-linecap="round"
                  stroke-dasharray="251"
                  :stroke-dashoffset="251 - (251 * fearGreedValue / 100)"
                  class="transition-all duration-1000 ease-out"
                />
                <!-- 중앙 값 -->
                <text 
                  x="100" 
                  y="80" 
                  text-anchor="middle" 
                  class="fill-slate-100 font-mono font-black text-3xl tracking-tight"
                >
                  {{ fearGreedValue }}
                </text>
                <text 
                  x="100" 
                  y="98" 
                  text-anchor="middle" 
                  class="fill-slate-500 font-black text-[8px] uppercase tracking-widest"
                >
                  Fear & Greed Index
                </text>
              </svg>
            </div>
            
            <!-- 게이지 양쪽 가이드 라벨 -->
            <span class="absolute left-4 bottom-4 text-[9px] font-black text-rose-500/60 tracking-wider">극도의 공포</span>
            <span class="absolute right-4 bottom-4 text-[9px] font-black text-indigo-400/60 tracking-wider">극도의 탐욕</span>
          </div>

          <!-- 투자 가이드라인 팁 카드 -->
          <div 
            class="rounded-2xl p-3.5 border border-white/5 transition-all duration-500"
            :class="fearGreedStatus.bgColor"
          >
            <span class="text-[10px] font-black text-slate-300 block mb-1 uppercase tracking-wider">🎯 시장 진단 & 대응 가이드</span>
            <p class="text-[11px] text-slate-400 font-bold leading-relaxed tracking-tight">
              {{ fearGreedStatus.tip }}
            </p>
          </div>

          <!-- 측정 기준 안내 (상시 노출) -->
          <div class="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
            <div class="p-4 bg-slate-950/40 text-[10px] text-slate-400 space-y-3.5 leading-relaxed">
              <div class="font-bold text-slate-300 border-b border-white/5 pb-2">
                <p class="mb-1 text-slate-200 flex items-center gap-1.5 font-black">
                  <UIcon name="i-heroicons-information-circle" class="w-3.5 h-3.5 text-indigo-400" />
                  <span>탐욕·공포 지수 수치 측정 기준 (7대 지표)</span>
                </p>
                <p class="text-[9px] text-slate-500 font-normal">※ 7가지 주요 시장 지표를 종합하여 산출하며, 각 지표는 동일한 가중치(약 14.3%)로 종합 지수에 반영됩니다.</p>
              </div>
              <div class="space-y-3">
                <div v-for="item in fearGreedDetails" :key="item.name" class="flex flex-col gap-1">
                  <div class="flex items-center justify-between font-black text-slate-200">
                    <span>{{ item.name }}</span>
                    <span :class="item.status.color" class="font-mono text-[9px] font-bold">{{ item.score }} / 100 ({{ item.status.label }})</span>
                  </div>
                  <!-- 미니 게이지 바 -->
                  <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      :class="item.status.barColor" 
                      class="h-full transition-all duration-1000 ease-out" 
                      :style="{ width: `${item.score}%` }"
                    />
                  </div>
                  <span class="pl-1 text-slate-400/95 text-[9.5px] leading-normal">{{ item.desc }}</span>
                </div>
              </div>
              <p class="text-[9px] text-slate-500 border-t border-white/5 pt-1.5 mt-1">
                * 본 서비스의 공포·탐욕 지수는 당일 날짜 기반의 시뮬레이션 데이터를 제공하므로, 실제 실시간 시장 지표와는 차이가 있을 수 있습니다.
              </p>
            </div>
          </div>
        </div>



        <!-- 3. 투자 꿀팁 & 금융 상식 (Interactive Accordion) -->
        <div class="glass-dark rounded-[1.75rem] p-5 border border-white/5 shadow-2xl relative overflow-hidden">
          <div class="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <UIcon name="i-heroicons-light-bulb" class="w-5 h-5 text-amber-400" />
            <div class="flex flex-col">
              <h3 class="text-sm font-black text-slate-100 tracking-tight">투자 꿀팁 & 금융 상식</h3>
              <span class="text-[9px] font-bold text-slate-500">꼭 알아야 할 알짜 상식</span>
            </div>
          </div>

          <!-- 아코디언 영역 -->
          <div class="space-y-3">
            <!-- 1. 국내외 주식 세금 가이드 -->
            <div class="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
              <button 
                class="w-full flex items-center justify-between p-3.5 text-xs font-black text-slate-200 hover:bg-white/[0.03] transition-colors"
                @click="toggleAccordion('tax')"
              >
                <span>💡 국내주식 vs 미국주식 세금 가이드</span>
                <UIcon 
                  :name="expandedGuide === 'tax' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                  class="w-4 h-4 text-slate-400 transition-transform duration-300"
                />
              </button>
              
              <div 
                v-show="expandedGuide === 'tax'" 
                class="p-4 border-t border-white/5 bg-slate-950/40 text-[11px] text-slate-400 space-y-3 leading-relaxed animate-fade-in"
              >
                <div>
                  <h5 class="text-xs font-bold text-brand-primary mb-1">🇺🇸 미국 주식 세금</h5>
                  <ul class="list-disc pl-4 space-y-1">
                    <li><strong class="text-slate-300">양도소득세:</strong> 매년 1월 1일 ~ 12월 31일 실현수익 중 <span class="text-rose-400 font-bold">250만 원까지 비과세</span>, 초과분에 대해 <span class="text-rose-400 font-bold">22% 분류과세</span> (다음 해 5월 자진 신고)</li>
                    <li><strong class="text-slate-300">배당소득세:</strong> 미국 현지에서 <span class="text-slate-200">15% 원천징수</span> 후 입금 (종합소득세 합산 기준 2천만 원 이하 시 종결)</li>
                  </ul>
                </div>
                
                <div>
                  <h5 class="text-xs font-bold text-indigo-400 mb-1">🇰🇷 국내 주식 세금</h5>
                  <ul class="list-disc pl-4 space-y-1">
                    <li><strong class="text-slate-300">증권거래세:</strong> 매도 시 자동으로 매도 대금의 <span class="text-slate-200">0.15% 내외</span> 원천징수</li>
                    <li><strong class="text-slate-300">배당소득세:</strong> 배당금 지급 시 국내 세율인 <span class="text-indigo-300 font-bold">15.4%</span> 원천징수 후 입금</li>
                    <li><strong class="text-slate-300">금융투자소득세:</strong> 시행 및 유예에 관한 정부·국회 동향 확인 필요 (기본공제 금액 및 통산세율 상이)</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 2. 지수추종 대표 ETF 가이드 -->
            <div class="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
              <button 
                class="w-full flex items-center justify-between p-3.5 text-xs font-black text-slate-200 hover:bg-white/[0.03] transition-colors"
                @click="toggleAccordion('etf')"
              >
                <span>📈 1등 시장 지수추종 대표 ETF 완벽 정리</span>
                <UIcon 
                  :name="expandedGuide === 'etf' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                  class="w-4 h-4 text-slate-400 transition-transform duration-300"
                />
              </button>

              <div 
                v-show="expandedGuide === 'etf'" 
                class="p-4 border-t border-white/5 bg-slate-950/40 text-[11px] text-slate-400 space-y-3 leading-relaxed animate-fade-in"
              >
                <p class="text-slate-300 font-medium">장기 적립식 투자의 대명사인 시장 지수추종 ETF의 해외 원조와 국내 매칭 상품 리스트입니다.</p>
                
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse text-left text-[10px]">
                    <thead>
                      <tr class="border-b border-white/10 text-slate-500 font-black">
                        <th class="py-1.5 pr-2">추종 지수</th>
                        <th class="py-1.5 pr-2">🇺🇸 미국 상장 원조</th>
                        <th class="py-1.5">🇰🇷 국내 상장 매칭</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5 font-bold text-slate-300">
                      <tr>
                        <td class="py-2 pr-2 text-slate-400">S&P 500</td>
                        <td class="py-2 pr-2">SPY, VOO, IVV</td>
                        <td class="py-2">TIGER S&P500, KODEX S&P500</td>
                      </tr>
                      <tr>
                        <td class="py-2 pr-2 text-slate-400">NASDAQ 100</td>
                        <td class="py-2 pr-2">QQQ, QQM</td>
                        <td class="py-2">TIGER 미국나스닥100, ACE 미국나스닥100</td>
                      </tr>
                      <tr>
                        <td class="py-2 pr-2 text-slate-400">KOSPI 200</td>
                        <td class="py-2 pr-2">-</td>
                        <td class="py-2 text-indigo-400">KODEX 200, TIGER 200</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div class="bg-brand-primary/5 rounded-lg p-2.5 border border-brand-primary/10 mt-1">
                  <span class="text-xs text-brand-primary font-black block mb-0.5">📌 꿀팁</span>
                  국내 상장 해외 지수 ETF는 연금저축펀드나 IRP 계좌에서 매수 시 <strong class="text-slate-200">연 1,000만 원 한도 세액공제</strong>와 <strong class="text-slate-200">과세이연 효과</strong>를 누려 훨씬 유리합니다!
                </div>
              </div>
            </div>

            <!-- 3. 국내외 탑 자산운용사 브랜드 -->
            <div class="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
              <button 
                class="w-full flex items-center justify-between p-3.5 text-xs font-black text-slate-200 hover:bg-white/[0.03] transition-colors"
                @click="toggleAccordion('manager')"
              >
                <span>🏢 국내외 유명 자산운용사 브랜드 알아보기</span>
                <UIcon 
                  :name="expandedGuide === 'manager' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                  class="w-4 h-4 text-slate-400 transition-transform duration-300"
                />
              </button>

              <div 
                v-show="expandedGuide === 'manager'" 
                class="p-4 border-t border-white/5 bg-slate-950/40 text-[11px] text-slate-400 space-y-3 leading-relaxed animate-fade-in"
              >
                <div>
                  <h5 class="text-xs font-bold text-brand-primary mb-1">🇺🇸 글로벌 자산운용사 빅3</h5>
                  <ul class="list-disc pl-4 space-y-1">
                    <li><strong class="text-slate-200">BlackRock (블랙록):</strong> 세계 1위 자산운용사로, 대표 브랜드는 <span class="text-brand-primary">iShares</span>입니다. (예: IVV)</li>
                    <li><strong class="text-slate-200">Vanguard (뱅가드):</strong> 인덱스 펀드의 개척자 존 보글이 설립하였으며, 매우 저렴한 수수료가 특징입니다. (예: VOO)</li>
                    <li><strong class="text-slate-200">State Street (SSGA):</strong> 인덱스 중심의 운용사로, 세계 최초의 ETF인 SPY를 상장시킨 <span class="text-indigo-400">SPDR</span> 브랜드를 보유하고 있습니다.</li>
                  </ul>
                </div>

                <div>
                  <h5 class="text-xs font-bold text-indigo-400 mb-1">🇰🇷 국내 대표 자산운용사 TOP 4</h5>
                  <ul class="list-disc pl-4 space-y-1">
                    <li><strong class="text-slate-200">삼성자산운용 (KODEX):</strong> 국내 최초 및 최대 점유율을 차지하고 있는 ETF 브랜드입니다.</li>
                    <li><strong class="text-slate-200">미래에셋자산운용 (TIGER):</strong> 다양한 혁신 테마(반도체, 2차전지 등)와 글로벌 상품 라인업이 강력합니다.</li>
                    <li><strong class="text-slate-200">한국투자신탁운용 (ACE):</strong> 최근 글로벌 반도체 및 빅테크 테마 등에서 고속 성장 중인 브랜드입니다.</li>
                    <li><strong class="text-slate-200">KB자산운용 (RISE):</strong> 기존 KBSTAR에서 RISE로 개편하며 경쟁력 있는 금리형/적립식 상품을 제공합니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. 최신 뉴스 탭 -->
      <section v-if="activeTab === 'news'" class="px-6 space-y-4 animate-fade-in">
        <div v-if="isLoading && newsItems.length === 0" class="flex flex-col items-center justify-center py-20 gap-4">
          <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"/>
          <p class="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">데이터 로드 중...</p>
        </div>

        <div v-else-if="newsItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <UIcon name="i-heroicons-newspaper" class="w-12 h-12 text-slate-700 mb-4" />
          <p class="text-sm text-slate-500 font-medium">등록된 뉴스가 없습니다.</p>
        </div>

        <template v-else>
          <div class="flex items-center justify-between mb-2 px-1">
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">최신 뉴스</span>
            <p v-if="totalCount > 0" class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              전체 <span class="text-brand-primary">{{ totalCount.toLocaleString() }}</span>건
            </p>
          </div>
          <NewsPanelCard
            v-for="item in newsItems"
            :key="item.id"
            :item="item"
            :is-hearted="isHearted(item.stockId)"
            :formatted-date="formatDate(item.published_at)"
            @navigate-news="navigateToNews(item)"
            @toggle-heart="toggleHeart"
            @navigate-stock="(stockCode) => navigateTo('/stocks/' + stockCode)"
          />

          <!-- 무한 스크롤 감지 요소 & 로딩 스피너 -->
          <div ref="sentinel" class="py-10 flex flex-col justify-center items-center gap-3">
            <div v-if="isFetchingMore" class="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"/>
            <p v-else-if="!hasMore && newsItems.length > 0" class="text-[10px] text-slate-600 font-black uppercase tracking-widest opacity-40">마지막 뉴스입니다</p>
          </div>
        </template>
      </section>

      <!-- 3. 경제 지표 목록 -->
      <section v-if="activeTab === 'indicators'" class="px-6 space-y-6 animate-fade-in">
        <EconomicIndicatorWrapper />
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { repairNewsUrl } from '~/utils/stock'

const { 
  fetchNews, 
  fetchEconomicIndicators, 
  toggleHeart, 
  hearts,
  fetchWishlist
} = useStock()

const route = useRoute()

// 탭 정보 ('stock' | 'news' | 'indicators')
const activeTab = ref<'stock' | 'news' | 'indicators'>(
  (route.query.tab as any) === 'indicators' ? 'indicators' : 
  (route.query.tab as any) === 'news' ? 'news' : 'stock'
)



const fearGreedDetails = computed(() => {
  const val = fearGreedValue.value
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  
  // 간단한 의사난수 도우미
  const getPseudoRandom = (offset: number, min: number, max: number) => {
    const x = Math.sin(seed + offset) * 10000
    const r = x - Math.floor(x)
    return Math.floor(r * (max - min + 1)) + min
  }

  // 7개 지표의 점수를 종합점수 주변으로 생성 (0~100 사이)
  const rawScores = [
    getPseudoRandom(1, Math.max(0, val - 15), Math.min(100, val + 15)),
    getPseudoRandom(2, Math.max(0, val - 12), Math.min(100, val + 12)),
    getPseudoRandom(3, Math.max(0, val - 20), Math.min(100, val + 20)),
    getPseudoRandom(4, Math.max(0, val - 10), Math.min(100, val + 10)),
    getPseudoRandom(5, Math.max(0, val - 25), Math.min(100, val + 25)),
    getPseudoRandom(6, Math.max(0, val - 18), Math.min(100, val + 18)),
    getPseudoRandom(7, Math.max(0, val - 14), Math.min(100, val + 14)),
  ]

  // 평균이 정확히 val이 되도록 미세 조정
  const sum = rawScores.reduce((a, b) => a + b, 0)
  const diff = val * 7 - sum
  const adjustment = Math.round(diff / 7)
  const scores = rawScores.map((score) => {
    let s = score + adjustment
    if (s < 0) s = 0
    if (s > 100) s = 100
    return s
  })
  
  // 점수에 따른 테마 컬러 및 라벨 도출
  const getStatus = (score: number) => {
    if (score <= 20) return { label: '극도의 공포', color: 'text-rose-500', barColor: 'bg-rose-500' }
    if (score <= 40) return { label: '공포', color: 'text-orange-400', barColor: 'bg-orange-400' }
    if (score <= 60) return { label: '중립', color: 'text-amber-400', barColor: 'bg-amber-400' }
    if (score <= 80) return { label: '탐욕', color: 'text-emerald-400', barColor: 'bg-emerald-400' }
    return { label: '극도의 탐욕', color: 'text-indigo-400', barColor: 'bg-indigo-400' }
  }

  const items = [
    { name: '1. 시장 모멘텀 (Market Momentum)', score: scores[0] ?? 0, desc: 'S&P 500 지수가 125일 이동평균선보다 얼마나 위에 있는지를 통해 시장의 상승 에너지를 측정합니다.' },
    { name: '2. 주가 강도 (Stock Price Strength)', score: scores[1] ?? 0, desc: '뉴욕증권거래소(NYSE)에서 52주 신고가를 경신한 주식 수와 신저가를 경신한 주식 수의 상대적 비율을 분석합니다.' },
    { name: '3. 주가 폭 (Stock Price Breadth)', score: scores[2] ?? 0, desc: '하락하는 주식 대비 상승하는 주식의 거래량을 비교하여 시장 전반의 참여율을 평가합니다.' },
    { name: '4. 풋/콜 옵션 비율 (Put and Call Options)', score: scores[3] ?? 0, desc: '하락장에 베팅하는 풋옵션과 상승장에 베팅하는 콜옵션의 거래 비율로 투자자들의 심리를 반영합니다.' },
    { name: '5. 시장 변동성 (Market Volatility)', score: scores[4] ?? 0, desc: 'VIX(변동성 지수)의 50일 이동평균을 통해 시장이 느끼는 단기적 불안과 공포의 크기를 확인합니다.' },
    { name: '6. 안전 자산 선호도 (Safe Haven Demand)', score: scores[5] ?? 0, desc: '위험 자산인 주식의 수익률과 안전 자산인 국채의 수익률 차이를 분석하여 자금의 이동 방향을 파악합니다.' },
    { name: '7. 정크본드 수요 (Junk Bond Demand)', score: scores[6] ?? 0, desc: '투자등급 채권과 정크본드(투기등급 채권) 간의 금리 차이(스프레드)를 통해 고위험 자산에 대한 선호도를 측정합니다.' },
  ]

  return items.map(item => ({
    ...item,
    status: getStatus(item.score)
  }))
})

// 아코디언 상태 관리 ('tax' | 'etf' | 'manager' | null)
const expandedGuide = ref<'tax' | 'etf' | 'manager' | null>(null)
const toggleAccordion = (section: 'tax' | 'etf' | 'manager') => {
  if (expandedGuide.value === section) {
    expandedGuide.value = null
  } else {
    expandedGuide.value = section
  }
}

// 1. 주식 정보 데이터 바인딩





// 2. 최신 뉴스 데이터 바인딩
const newsItems = ref<any[]>([])
const isLoading = ref(true)
const totalCount = ref(0)

// 페이징 상태
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const isFetchingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)

const isHearted = (id: number) => hearts.value.includes(Number(id))

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric'
  })
}

const navigateToNews = (item: any) => {
  const url = repairNewsUrl(item.url, item.stockCode)
  if (url) {
    window.open(url, '_blank')
  }
}

const loadNews = async (isAppend = false) => {
  try {
    if (!isAppend) {
      isLoading.value = true
      page.value = 1
      hasMore.value = true
    } else {
      isFetchingMore.value = true
    }

    const response = await fetchNews(pageSize, page.value, 'all')
    const data = response.data || []
    totalCount.value = response.count || 0
    
    if (isAppend) {
      newsItems.value = [...newsItems.value, ...data]
    } else {
      newsItems.value = data
    }

    if (data.length < pageSize) {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Failed to load news:', error)
  } finally {
    isLoading.value = false
    isFetchingMore.value = false
  }
}

const loadMore = () => {
  if (!hasMore.value || isFetchingMore.value || isLoading.value) return
  page.value++
  loadNews(true)
}

let observer: IntersectionObserver | null = null



// 탭 감시 및 필요한 데이터 동적 로드
watch(activeTab, (newTab) => {
  if (newTab === 'news' && newsItems.value.length === 0) {
    loadNews()
  } 
}, { immediate: true })

onMounted(async () => {
  // 위시리스트 그룹과 동시 로드
  await fetchWishlist()

  // Intersection Observer 설정 (최신 뉴스 탭용 무한스크롤)
  observer = new IntersectionObserver((entries) => {
    if (entries[0] && entries[0].isIntersecting && activeTab.value === 'news') {
      loadMore()
    }
  }, { rootMargin: '200px' })

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const fearGreedValue = computed(() => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = today.getMonth() + 1
  const dd = today.getDate()
  
  // 날짜 기반 의사 난수 생성
  const seed = (yyyy * 10000 + mm * 100 + dd)
  const x = Math.sin(seed) * 10000
  const randomVal = Math.floor((x - Math.floor(x)) * 40) + 40 // 40~80 사이 유도
  return randomVal
})

const fearGreedStatus = computed(() => {
  const val = fearGreedValue.value
  if (val <= 20) {
    return {
      label: '극도의 공포',
      english: 'Extreme Fear',
      colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      gaugeColor: '#f43f5e',
      bgColor: 'bg-rose-500/5',
      tip: '🚨 시장에 공포가 가득합니다! 역사적으로 극도의 공포 구간은 매력적인 장기 매수 기회였습니다. 감정에 휩쓸려 패닉 셀을 하기보다 가치 있는 종목의 분할 매수를 검토해 보세요.'
    }
  } else if (val <= 40) {
    return {
      label: '공포',
      english: 'Fear',
      colorClass: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
      gaugeColor: '#fb923c',
      bgColor: 'bg-orange-400/5',
      tip: '⚠️ 투자 심리가 위축되어 있습니다. 단기 변동성이 커질 수 있으니 레버리지 투자를 지양하고, 현금 비중을 유지하며 우량 자산 위주로 포트폴리오를 다듬을 때입니다.'
    }
  } else if (val <= 60) {
    return {
      label: '중립',
      english: 'Neutral',
      colorClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      gaugeColor: '#fbbf24',
      bgColor: 'bg-amber-400/5',
      tip: '⚖️ 시장의 방향성이 탐색되는 중립 구간입니다. 호재와 악재가 팽팽히 맞서고 있으니 섣부른 추격 매수보다는 개별 기업의 펀더멘탈과 다가올 실적 발표에 주목하세요.'
    }
  } else if (val <= 80) {
    return {
      label: '탐욕',
      english: 'Greed',
      colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      gaugeColor: '#34d399',
      bgColor: 'bg-emerald-400/5',
      tip: '📈 투자 심리가 활발한 탐욕 구간입니다. 단기적으로 추가 상승 여력이 있을 수 있지만, 과열 조짐이 서서히 보이기 시작하므로 신규 진입 시 철저한 분할 매수로 대응하세요.'
    }
  } else {
    return {
      label: '극도의 탐욕',
      english: 'Extreme Greed',
      colorClass: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
      gaugeColor: '#818cf8',
      bgColor: 'bg-indigo-400/5',
      tip: '🔥 시장이 극도로 과열되었습니다! 남들이 탐욕을 부릴 때 두려워하라는 거장의 말처럼, 현재 구간에서는 무리한 추격 매수를 피하고 보유 자산의 일부 수익 실현을 고민해 볼 시점입니다.'
    }
  }
})
</script>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-x {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.animate-scale-x {
  animation: scale-x 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: left;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* 테이블 깔끔한 보더선 */
table th, table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
table tr:last-child td {
  border-bottom: none;
}
</style>
