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
 * 종목이 ETF인지 여부 확인
 */
function isEtf(name: string): boolean {
  const etfKeywords = [
    'ETF', 'ETN', 'KODEX', 'TIGER', 'KBSTAR', 'ACE', 'SOL', 'ARIRANG', 
    'HANARO', 'KOSEF', 'RISE', 'PLUS', 'TIMEFOLIO', 'WOORI', 'HI', 
    'UNIPLAT', 'HANA', 'KOSEF'
  ]
  const upperName = name.toUpperCase()
  return etfKeywords.some(keyword => upperName.includes(keyword))
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function buildFallbackAnalysis(
  stockName: string,
  newsItems: any[],
  priceHistory: any[]
): { summary: string, score: number } {
  const recentChange = Number(priceHistory?.[0]?.change_rate || 0)
  const newsCount = newsItems?.length || 0
  const momentumBias = recentChange * 8
  const newsBias = Math.min(10, newsCount * 2)
  const baseScore = 48 + momentumBias + newsBias
  const fallbackScore = clampScore(baseScore)

  if (newsItems.length > 0) {
    return {
      summary: `${stockName} 관련 이슈 반영 구간으로 변동성 확대 가능성이 있습니다.`,
      score: fallbackScore
    }
  }

  return {
    summary: `${stockName}은 최근 수급과 가격 흐름 중심의 기술적 구간입니다.`,
    score: fallbackScore
  }
}

/**
 * Gemini를 사용하여 종목 요약 및 추천 점수 산출
 */
async function analyzeStockWithGemini(
  newsItems: any[], 
  priceHistory: any[],
  stockCode: string,
  stockName: string, 
  sector: string,
  marketContext: string,
  targetDate: string
): Promise<{ summary: string, score: number, reasoning: string, target_price: number | null, target_date: string | null }> {
  if (!GEMINI_API_KEY) {
    return buildFallbackAnalysis(stockName, newsItems, priceHistory)
  }

  const newsSummary = newsItems.length > 0 
    ? newsItems.map(item => `- ${item.tit}`).join('\n')
    : '최근 주요 뉴스 없음'

  const priceSummary = priceHistory.length > 0
    ? priceHistory.map((h: any) => `- ${h.price_date}: ${h.close_price}원 (${h.change_rate >= 0 ? '+' : ''}${h.change_rate}%, 거래량: ${h.volume?.toLocaleString() || 'N/A'})`).join('\n')
    : '최근 시세 데이터 없음'

  const prompt = `주식 전문 분석가로서 ${stockName} (${sector || '일반'}) 종목에 대해 다음 영업일의 주가 방향성을 분석해 주세요.

[현재 시장 상황]
${marketContext}

[최근 7일 주가 흐름]
${priceSummary}

[최근 주요 뉴스]
${newsSummary}

 분석 지침:
1. **기술적 분석**: 최근 20일간의 주가 흐름, 거래량 변화, 5일/20일 이동평균선과의 이격도 및 변동성을 고려하여 단기적인 기술적 반등 또는 추세 지속 가능성을 평가하세요. 특히 거래량이 실린 상승인지 혹은 거래량 없는 기술적 반등인지 확인이 중요합니다.
2. **재료적 분석**: 뉴스의 강도와 시장 영향력을 분석하세요. 최근 이슈가 주가에 이미 반영되었는지(선반영), 아니면 추가 상승 동력이 될 수 있는지 판단하세요.
3. **단계적 추론(Chain-of-Thought)**: 
   - 먼저 거래량과 지표를 분석하세요.
   - 그 다음 최근 재료(뉴스)의 실제 영향력을 분석하세요.
   - 마지막으로 종합적인 판단 근거를 기술하세요.
4. **종합 판단**: 위 정보를 종합하여 다음 영업일의 주가 상승 가능성을 0~100점 사이의 점수로 산출하세요.
   - 80점 이상: 강력한 상승 모멘텀 보유
   - 60~79점: 상승 가능성 높음 (완만한 상승 또는 기술적 반등)
   - 40~59점: 중립 (뚜렷한 방향성 없음)
   - 40점 미만: 하락 리스크 또는 조정 가능성 높음

반드시 아래 JSON 형식으로만 응답하세요.
{
  "reasoning": "점수 산출의 핵심 논거 및 추론 과정 (300자 이내)",
  "summary": "핵심 요약 (50자 이내)",
  "score": 산출된 점수,
  "target_price": 3~6개월 내 도달 가능한 목표가(숫자만),
  "target_date": "목표 달성 예상일 (YYYY-MM-DD 형식, 현재로부터 3~6개월 후)"
}

참고: 50점은 절대적인 중립을 의미합니다. 데이터에 근거하여 가급적 0~45 또는 55~100 사이의 변별력 있는 점수를 산출해 주세요.`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              reasoning: { type: "STRING" },
              summary: { type: "STRING" },
              score: { type: "NUMBER" },
              target_price: { type: "NUMBER" },
              target_date: { type: "STRING" }
            },
            required: ["reasoning", "summary", "score", "target_price", "target_date"]
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API Error (${response.status}):`, errorText)
      
      // 로그 저장 (실패)
      await supabase.from('ai_analysis_logs').insert({
        stock_code: stockCode,
        stock_name: stockName,
        prompt: prompt,
        response_raw: { error: errorText, status: response.status },
        ai_score: 50,
        game_date: targetDate
      })

      return buildFallbackAnalysis(stockName, newsItems, priceHistory)
    }

    const data = await response.json()
    const rawParts = data?.candidates?.[0]?.content?.parts || []
    let resultText = rawParts
      .map((part: any) => part?.text || '')
      .join('\n')
      .trim()

    if (!resultText) {
      resultText = '{}'
    }
    
    // JSON 추출
    const jsonMatch = resultText.match(/\{[\s\S]*\}/)
    if (jsonMatch) resultText = jsonMatch[0]
    
    let parsed: any = {}
    try {
      parsed = JSON.parse(resultText)
    } catch (e) {
      console.error('JSON Parse Error:', resultText)
      parsed = {}
    }

    const fallback = buildFallbackAnalysis(stockName, newsItems, priceHistory)
    const parsedScore = Number(parsed.score)
    const finalScore = Number.isFinite(parsedScore) ? clampScore(parsedScore) : fallback.score
    const finalSummary = parsed.summary || fallback.summary
    const finalReasoning = parsed.reasoning || finalSummary

    // 로그 저장 (성공)
    await supabase.from('ai_analysis_logs').insert({
      stock_code: stockCode,
      stock_name: stockName,
      prompt: prompt,
      response_raw: data,
      ai_score: finalScore,
      ai_reasoning: finalReasoning,
      game_date: targetDate
    })

    return {
      summary: finalSummary,
      score: finalScore,
      reasoning: finalReasoning,
      target_price: parsed.target_price || null,
      target_date: parsed.target_date || null
    }
  } catch (err: any) {
    console.error('Gemini Analysis Exception:', err)

    // 로그 저장 (예외)
    await supabase.from('ai_analysis_logs').insert({
      stock_code: stockCode,
      stock_name: stockName,
      prompt: prompt,
      response_raw: { exception: err.message },
      ai_score: 50,
      game_date: targetDate
    })

    return { ...buildFallbackAnalysis(stockName, newsItems, priceHistory), reasoning: '' }
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

    // ETF 필터링: 개별 종목만 선정하기 위해 ETF 브랜드 및 검색어를 필터링합니다.
    const filteredStocks = allStocks.filter(stock => !isEtf(stock.name))
    console.log(`Filtered candidates: ${filteredStocks.length} stocks (removed ETFs).`)

    if (filteredStocks.length === 0) throw new Error('No valid individual stocks found after filtering ETFs.')

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
      if (logEntry) {
        await supabase
          .from('batch_execution_logs')
          .update({
            status: 'success',
            processed_count: 0,
            message: `Already selected for ${targetDateStr}.`,
            finished_at: new Date().toISOString()
          })
          .eq('id', logEntry.id)
      }
      return new Response(JSON.stringify({ message: 'Already selected.', game_date: targetDateStr }), { status: 200 })
    }

    // 이미 일부 데이터가 있는 상태(예: 과거 실패 실행으로 1~4건만 존재)에서는
    // 동일 날짜 데이터를 교체해 항상 최신 분석 결과로 재구성합니다.
    if (existingCount && existingCount > 0) {
      const { error: deleteError } = await supabase
        .from('daily_stocks')
        .delete()
        .eq('game_date', targetDateStr)

      if (deleteError) {
        throw new Error(`Failed to cleanup existing daily_stocks: ${deleteError.message}`)
      }
    }

    // 3. 종목별 분석 및 점수 산출
    console.log('Analyzing candidates with Gemini...')
    const scoredStocks: any[] = []
    const analysisTargetCount = Math.min(Math.max(10, filteredStocks.length), 20)
    const stocksToAnalyze = filteredStocks.slice(0, analysisTargetCount)
    
    for (const stock of stocksToAnalyze) {
      console.log(`Analyzing ${stock.name}...`)
      try {
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=3`
        
        let newsItems = []
        let priceHistory: any[] = []

        try {
          // 20일치 시세 데이터 조회 (기술적 지표 분석을 위해 확장)
          const { data: history } = await supabase
            .from('stock_price_history')
            .select('price_date, close_price, change_rate, volume')
            .eq('stock_id', stock.id)
            .order('price_date', { ascending: false })
            .limit(20)
          
          priceHistory = history || []

          const [newsRes] = await Promise.all([
            fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(2500) })
          ])
          if (newsRes.ok) newsItems = (await newsRes.json())?.items || []
        } catch (e) { /* ignore fetch errors */ }

        const { summary, score, reasoning, target_price, target_date } = await analyzeStockWithGemini(
          newsItems, 
          priceHistory,
          stock.code,
          stock.name, 
          stock.sector, 
          marketContext,
          targetDateStr
        )
        scoredStocks.push({ ...stock, summary, score, reasoning, target_price, target_date })
        
        // Rate Limit(free tier) 준수를 위한 지연 제거 (타임아웃 방지 우선)
        // await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err: any) {
        console.warn(`Failed to analyze ${stock.name}:`, err.message)
      }
    }

    // 4. 점수 높은 순으로 정렬 후 상위 5개 선정
    scoredStocks.sort((a, b) => b.score - a.score)
    const finalSelection = scoredStocks.slice(0, 5)

    console.log(`Final Selection: ${finalSelection.map(s => `${s.name}(${s.score})`).join(', ')}`)
    
    if (logEntry) {
      await supabase.from('batch_execution_logs').update({
        message: `Analyzing completed. Inserting ${finalSelection.length} stocks...`
      }).eq('id', logEntry.id)
    }

    let processedCount = 0
    for (const stock of finalSelection) {
      const { error: insErr } = await supabase
        .from('daily_stocks')
        .insert({
          stock_id: stock.id,
          game_date: targetDateStr,
          llm_summary: stock.summary,
          ai_score: stock.score,
          ai_reasoning: stock.reasoning,
          target_price: stock.target_price,
          target_date: stock.target_date,
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
    // 에러 발생 시 로그 업데이트 시도
    try {
      // logEntry를 찾기 위해 startTime으로 쿼리 (또는 위상에서 변수 접근)
      const { data: latestLog } = await supabase
        .from('batch_execution_logs')
        .select('id')
        .eq('function_name', 'select-daily-stocks')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      
      if (latestLog) {
        await supabase
          .from('batch_execution_logs')
          .update({
            status: 'fail',
            message: err.message,
            finished_at: new Date().toISOString()
          })
          .eq('id', latestLog.id)
      }
    } catch (logErr) {
      console.error('Failed to update fail log:', logErr)
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
