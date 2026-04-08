import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

/**
 * Gemini를 사용하여 종목 요약 및 추천 점수 산출
 */
async function analyzeStockWithGemini(newsItems: any[], disclosureItems: any[], stockName: string, sector: string): Promise<{ summary: string, score: number }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  let prompt = `당신은 주식 예측 게임의 전문가이자 전문 퀀트 분석가입니다. 
다음 제공되는 '${stockName}'(${sector || '기타'} 섹터) 관련 뉴스 및 공시 정보를 분석하여, **익일(다음 영업일) 주가 상승 가능성**을 평가하고 요약해 주세요.

[분석 지표]
1. 수익 실질 영향도: 해당 이슈가 기업 수익성에 즉각적이고 긍정적인 영향을 미치는가?
2. 신규성: 이미 시장에 알려진 내용인가, 아니면 새로운 호재인가?
3. 기술적/테마 모멘텀: 거래량 급등이나 강력한 테마 형성이 동반되는가?

[응답 지침]
1. 요약(summary): 핵심 이슈를 **딱 1문장(50자 내외)**으로 짧고 강렬하게 작성하세요. 종목명은 생략하고 마침표(.)로 끝내세요.
2. 점수(score): 0점에서 100점 사이의 정수로 산출하세요. (100점에 가까울수록 강력한 상승 시그널)
3. 반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "분석 요약 문장.",
  "score": 85
}

`
  
  if (newsItems && newsItems.length > 0) {
    prompt += `[최근 뉴스]\n`
    newsItems.slice(0, 3).forEach((n: any) => {
      prompt += `- ${n.tit}\n`
    })
  }

  if (disclosureItems && disclosureItems.length > 0) {
    prompt += `\n[최근 공시]\n`
    disclosureItems.slice(0, 2).forEach((d: any) => {
      prompt += `- ${d.title}\n`
    })
  }

  if (!newsItems.length && !disclosureItems.length) {
    prompt += `\n(특이 뉴스나 공시가 적은 상태입니다. 섹터의 업황과 일반적인 시장 기대치를 반영하여 보수적으로 평가해 주세요.)\n`
  }

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
    throw new Error(`Gemini API failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  
  // Markdown ```json ... ``` wrapper 제거 고도화
  resultText = resultText.replace(/```json\n?|```/g, '').trim()
  
  try {
    const parsed = JSON.parse(resultText)
    return {
      summary: parsed.summary || '종목의 최근 이슈를 분석 중입니다.',
      score: typeof parsed.score === 'number' ? parsed.score : 50
    }
  } catch (e) {
    console.error('Gemini JSON Parse Error. Raw Text:', resultText)
    // 파싱 조차 실패할 경우, 최소한의 텍스트가 있다면 그것이라도 사용 시도
    if (resultText && resultText.length > 10) {
       return { summary: resultText.substring(0, 100), score: 50}
    }
    return { summary: '최근 뉴스를 분석하여 주가 모멘텀을 산출 중입니다.', score: 50 }
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
    // data는 보통 { stocks: [...] } 또는 배열 형태일 수 있음. 
    // 네이버 모바일 API 특성상 구조 확인 필요. 보통 items 아래에 있음.
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
    
    // 1. 후보 종목군 수집 (시총 상위 + 거래대금 상위 + 상승률 상위)
    console.log('Collecting candidate stocks...')
    
    const [topTrading, topGainers] = await Promise.all([
      fetchRankingStocks('TOP_TRADING'),
      fetchRankingStocks('TOP_GAIN')
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
      .limit(50) // 너무 많으면 API 부하가 크므로 제한
    
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
    const scoredStocks = []

    // 한 번에 너무 많은 API 요청을 보내지 않기 위해 순차 또는 소규모 병렬 처리
    for (const stock of allStocks.slice(0, 30)) { // 최대 30개 분석
      try {
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=3`
        const discUrl = `https://m.stock.naver.com/api/stock/${stock.code}/disclosure?pageSize=3&page=1`
        
        let newsItems = []
        let disclosureItems = []

        try {
          const [newsRes, discRes] = await Promise.all([
            fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) }),
            fetch(discUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) })
          ])
          if (newsRes.ok) newsItems = (await newsRes.json())?.items || []
          if (discRes.ok) disclosureItems = (await discRes.json()) || []
        } catch (e) { /* ignore fetch errors */ }

        const { summary, score } = await analyzeStockWithGemini(newsItems, disclosureItems, stock.name, stock.sector)
        scoredStocks.push({ ...stock, summary, score })
        
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
          message: `Selected ${processedCount} stocks with scoring.`,
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
