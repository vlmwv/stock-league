import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

/**
 * 시장 지수(KOSPI, KOSDAQ) 정보 수집
 */
async function fetchMarketIndices(): Promise<string> {
  try {
    const url = 'https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI,KOSDAQ'
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) })
    if (!res.ok) return '시장 지수 정보를 가져올 수 없습니다.'
    const data = await res.json()
    const indices = data?.datas || []
    return indices.map((idx: any) => 
      `${idx.nm}: ${idx.clssv} (${idx.cr >= 0 ? '+' : ''}${idx.cr}%)`
    ).join(', ')
  } catch (e) {
    return '시장 지수 정보가 제공되지 않았습니다.'
  }
}

/**
 * Gemini를 사용하여 종목 요약 및 추천 점수 산출
 */
async function analyzeStockWithGemini(
  newsItems: any[], 
  disclosureItems: any[], 
  priceHistory: any[],
  stockName: string, 
  sector: string,
  marketContext: string
): Promise<{ summary: string, score: number }> {
  if (!GEMINI_API_KEY) return { summary: '환경 변수(GEMINI_API_KEY)가 설정되지 않았습니다.', score: 50 }

  const newsSummary = newsItems.length > 0 
    ? newsItems.map(item => `- ${item.tit}`).join('\n')
    : '최근 주요 뉴스 없음'
  
  const disclosureSummary = disclosureItems.length > 0
    ? disclosureItems.map(item => `- ${item.title}`).join('\n')
    : '최근 공시 없음'

  const priceSummary = priceHistory.length > 0
    ? priceHistory.map((h: any) => `- ${h.price_date}: ${h.close_price}원 (${h.change_rate >= 0 ? '+' : ''}${h.change_rate}%)`).join('\n')
    : '최근 시세 데이터 없음'

  const prompt = `주식 전문 분석가로서 ${stockName} (${sector || '일반'}) 종목에 대해 다음 영업일의 주가 방향성을 분석해 주세요.

[현재 시장 상황]
${marketContext}

[최근 7일 주가 흐름]
${priceSummary}

[최근 주요 뉴스]
${newsSummary}

[최근 주요 공시]
${disclosureSummary}

분석 지침:
1. **기술적 분석**: 최근 주가 흐름(상승/하락/횡보)과 변동성을 고려하여 단기적인 기술적 반등 또는 추세 지속 가능성을 평가하세요.
2. **재료적 분석**: 뉴스 및 공시의 강도와 시장 영향력을 분석하세요. 최근 이슈가 주가에 이미 반영되었는지(선반영), 아니면 추가 상승 동력이 될 수 있는지 판단하세요.
3. **종합 판단**: 위 정보를 종합하여 다음 영업일의 주가 상승 가능성을 0~100점 사이의 점수로 산출하세요.
   - 80점 이상: 강력한 상승 모멘텀 보유
   - 60~79점: 상승 가능성 높음 (완만한 상승 또는 기술적 반등)
   - 40~59점: 중립 (뚜렷한 방향성 없음)
   - 40점 미만: 하락 리스크 또는 조정 가능성 높음

반드시 아래 JSON 형식으로만 응답하세요.
{
  "summary": "기술적 분석과 호재/악재를 결합한 핵심 요약 (50자 이내)",
  "score": 산출된 점수
}`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          response_mime_type: "application/json"
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API Error (${response.status}):`, errorText)
      return { summary: '최근 주요 뉴스 및 공시 내용을 분석 중입니다.', score: 50 }
    }

    const data = await response.json()
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // JSON 추출
    const jsonMatch = resultText.match(/\{[\s\S]*\}/)
    if (jsonMatch) resultText = jsonMatch[0]
    
    const parsed = JSON.parse(resultText)
    return {
      summary: parsed.summary || '종목의 최근 모멘텀을 분석 중입니다.',
      score: typeof parsed.score === 'number' ? parsed.score : 50
    }
  } catch (err) {
    console.error('Gemini Analysis Exception:', err)
    return { summary: '섹터 업황 및 최근 뉴스를 종합적으로 분석 중입니다.', score: 50 }
  }
}

/**
 * 네이버 랭킹 API에서 종목 코드 추출
 */
async function fetchRankingStocks(category: string): Promise<string[]> {
  try {
    const url = `https://m.stock.naver.com/api/ready/rankingList?category=${category}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return []
    const data = await res.json()
    const items = data?.items || []
    return items.map((item: any) => item.cd).filter(Boolean)
  } catch (e: any) {
    console.warn(`Failed to fetch ranking for ${category}:`, e.message)
    return []
  }
}

Deno.serve(async (req: any) => {
  try {
    console.log('Advanced Select Daily Stocks Triggered...')
    const startTime = new Date().toISOString()
    
    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'select-daily-stocks',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    
    // 1. 후보 종목군 수집 (시총 상위 + 거래대금 상위 + 상승률 상위 + 시장 지수)
    console.log('Collecting candidate stocks...')
    
    const [topTrading, topGainers, marketContext] = await Promise.all([
      fetchRankingStocks('TOP_TRADING'),
      fetchRankingStocks('TOP_GAIN'),
      fetchMarketIndices()
    ])

    const { data: topMarketCapStocks } = await supabase
      .from('stocks')
      .select('code')
      .lte('market_cap_rank', 100)
    
    const candidateCodes = new Set([
      ...topTrading.slice(0, 15),
      ...topGainers.slice(0, 10),
      ...(topMarketCapStocks?.map(s => s.code) || [])
    ])

    console.log(`Initial candidates: ${candidateCodes.size} stocks.`)

    // DB에서 실제 정보 조회
    const { data: allStocks, error: fetchError } = await supabase
      .from('stocks')
      .select('id, code, name, sector')
      .in('code', Array.from(candidateCodes))
      .limit(50) 
    
    if (fetchError) throw fetchError
    if (!allStocks || allStocks.length === 0) throw new Error('No stocks found in DB.')

    // 2. 내일 날짜 계산 (KST 기준)
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(Date.now() + kstOffset)
    const targetDate = new Date(kstNow)
    const currentDay = kstNow.getDay()
    
    let daysToAdd = 1
    if (currentDay === 5) daysToAdd = 3 // 금 -> 월
    else if (currentDay === 6) daysToAdd = 2 // 토 -> 월
    targetDate.setDate(kstNow.getDate() + daysToAdd)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    // 이미 종목이 선정되어 있는지 확인
    const { count: existingCount } = await supabase
      .from('daily_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('game_date', targetDateStr)
    
    if (existingCount && existingCount >= 5) {
      return new Response(JSON.stringify({ message: 'Already selected.', game_date: targetDateStr }), { status: 200 })
    }

    // 3. 종목별 분석 및 점수 산출
    console.log('Analyzing candidates with Gemini...')
    const scoredStocks: any[] = []
    const limit = 10 

    const stocksToAnalyze = allStocks.slice(0, limit)
    
    for (const stock of stocksToAnalyze) {
      console.log(`Analyzing ${stock.name}...`)
      try {
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=3`
        const discUrl = `https://m.stock.naver.com/api/stock/${stock.code}/disclosure?pageSize=3&page=1`
        
        let newsItems = []
        let disclosureItems = []
        let priceHistory: any[] = []

        try {
          // 일주일치 시세 데이터 조회
          const { data: history } = await supabase
            .from('stock_price_history')
            .select('price_date, close_price, change_rate')
            .eq('stock_id', stock.id)
            .order('price_date', { ascending: false })
            .limit(7)
          
          priceHistory = history || []

          const [newsRes, discRes] = await Promise.all([
            fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(2500) }),
            fetch(discUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(2500) })
          ])
          if (newsRes.ok) newsItems = (await newsRes.json())?.items || []
          if (discRes.ok) disclosureItems = (await discRes.json()) || []
        } catch (e) { /* ignore fetch errors */ }

        const { summary, score } = await analyzeStockWithGemini(
          newsItems, 
          disclosureItems, 
          priceHistory,
          stock.name, 
          stock.sector, 
          marketContext
        )
        scoredStocks.push({ ...stock, summary, score })
        
        // Rate Limit(free tier) 준수를 위한 지연 (1초)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err: any) {
        console.warn(`Failed to analyze ${stock.name}:`, err.message)
      }
    }

    // 4. 점수 높은 순으로 정렬 후 상위 5개 선정
    scoredStocks.sort((a, b) => b.score - a.score)
    const finalSelection = scoredStocks.slice(0, 5)

    console.log(`Final Selection: ${finalSelection.map(s => `${s.name}(${s.score})`).join(', ')}`)

    let processedCount = 0
    for (const stock of finalSelection) {
      const { error: insErr } = await supabase
        .from('daily_stocks')
        .insert({
          stock_id: stock.id,
          game_date: targetDateStr,
          llm_summary: stock.summary,
          ai_score: stock.score,
          status: 'pending'
        })
      if (!insErr) processedCount++
    }

    // 로그 종료 기록
    if (logEntry) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: processedCount,
          message: `Selected ${processedCount} stocks with advanced scoring.`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify({ 
      message: `Successfully selected ${processedCount} stocks.`, 
      game_date: targetDateStr,
      selected: finalSelection.map(s => ({ name: s.name, score: s.score }))
    }), { status: 200 })
    
  } catch (err: any) {
    console.error('Fatal Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
