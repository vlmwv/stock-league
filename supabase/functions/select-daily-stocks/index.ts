import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function summarizeStockWithGemini(newsItems: any[], disclosureItems: any[], stockName: string, sector: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  let prompt = `당신은 주식 예측 게임의 전문가입니다. 사용자들이 내일 주가 향방(상승/하락)을 예측할 수 있도록, 다음의 최근 뉴스 및 공 정보를 바탕으로 '${stockName}'(${sector || '기타'} 섹터) 종목을 내일의 예측 게임 종목으로 추천하는 이유 혹은 관전 포인트를 2~3문장 이내로 핵심만 아주 짧고 흥미롭게 작성해주세요.\n\n`
  
  if (newsItems && newsItems.length > 0) {
    prompt += `[최근 뉴스]\n`
    newsItems.slice(0, 2).forEach((n: any, i: number) => {
      prompt += `- ${n.tit}\n`
    })
  }

  if (disclosureItems && disclosureItems.length > 0) {
    prompt += `\n[최근 공시]\n`
    disclosureItems.slice(0, 2).forEach((d: any, i: number) => {
      prompt += `- ${d.title}\n`
    })
  }

  if (!newsItems.length && !disclosureItems.length) {
    prompt += `(최근 특징적인 뉴스나 공시가 없습니다. 해당 기업의 섹터(${sector || '기타'})와 일반적인 시장 상황을 가정하여 추천 이유를 작성해주세요.)\n\n`
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API Error Detail:', errorText)
    throw new Error(`Gemini API failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  return summaryText?.trim() || '추천 사유를 생성하지 못했습니다.'
}

Deno.serve(async (req) => {
  try {
    console.log('Selecting daily stocks triggered...')
    
    // 1. 시가총액 상위 100개 종목 가져오기
    const { data: topStocks, error: topError } = await supabase
      .from('stocks')
      .select('id, code, name, sector')
      .lte('market_cap_rank', 100)
    
    if (topError) throw topError
    if (!topStocks || topStocks.length === 0) {
      throw new Error('No stocks found in the database. Please run update-krx-stocks first.')
    }

    // 배열 섞기 (Fisher-Yates shuffle)
    const shuffledStocks = [...topStocks]
    for (let i = shuffledStocks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStocks[i], shuffledStocks[j]] = [shuffledStocks[j], shuffledStocks[i]];
    }

    const selectedStocks = shuffledStocks.slice(0, 5)
    console.log(`Selected 5 stocks: ${selectedStocks.map((s: any) => s.name).join(', ')}`)

    // 내일 날짜 (KST 기준) 구하기
    const now = new Date()
    // KST는 UTC+9
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    
    // 타겟 날짜 계산: 오늘이 아니라 '다음 영업일'을 찾습니다.
    const targetDate = new Date(kstNow)
    const currentDay = kstNow.getDay() // 0(일) ~ 6(토)
    
    let daysToAdd = 1
    if (currentDay === 5) { // 금요일 -> 월요일 (+3)
      daysToAdd = 3
    } else if (currentDay === 6) { // 토요일 -> 월요일 (+2)
      daysToAdd = 2
    }
    targetDate.setDate(kstNow.getDate() + daysToAdd)
    
    const targetDateStr = targetDate.toISOString().split('T')[0]
    console.log(`Target game_date (Next Business Day): ${targetDateStr}`)
    
    let processedCount = 0
    let errors = []
    
    // 2. 각 종목별 뉴스 수집 및 Gemini 요약 생성
    for (const stock of selectedStocks) {
      try {
        console.log(`Fetching News & Disclosures for ${stock.name} (${stock.code})...`)
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=3`
        const disclosureUrl = `https://m.stock.naver.com/api/stock/${stock.code}/disclosure?pageSize=3&page=1`
        
        let newsItems = []
        let disclosureItems = []

        try {
          const [newsRes, discRes] = await Promise.all([
            fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) }),
            fetch(disclosureUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) })
          ])
          
          if (newsRes.ok) {
            const newsData = await newsRes.json()
            newsItems = newsData?.items || []
          }
          
          if (discRes.ok) {
            const discData = await discRes.json()
            disclosureItems = Array.isArray(discData) ? discData : (discData?.items || [])
          }
        } catch (fetchErr: any) {
          console.warn(`External API fetch failed for ${stock.name}: ${fetchErr.message}`)
          // API 호출 실패해도 계속 진행 (Gemini가 일반 시장 상황으로 요약 생성)
        }
        
        console.log(`Generating summary with Gemini for ${stock.name}...`)
        const summary = await summarizeStockWithGemini(newsItems, disclosureItems, stock.name, stock.sector)
        
        // 3. daily_stocks 테이블에 중복 여부 확인 후 삽입
        const { data: existing, error: checkError } = await supabase
          .from('daily_stocks')
          .select('id')
          .eq('game_date', targetDateStr)
          .eq('stock_id', stock.id)
          .maybeSingle()
          
        if (checkError) throw checkError
        
        if (!existing) {
          const { error: insertError } = await supabase
            .from('daily_stocks')
            .insert({
              stock_id: stock.id,
              game_date: targetDateStr,
              llm_summary: summary,
              status: 'pending'
            })
            
          if (insertError) throw insertError
          processedCount++
          console.log(`Successfully saved daily_stock for ${stock.name} on ${targetDateStr}`)
        } else {
          console.log(`${stock.name} is already selected for ${targetDateStr}`)
        }
        
      } catch (err: any) {
        console.error(`Error processing stock ${stock.name}:`, err.message)
        errors.push({ stock: stock.name, error: err.message })
      }
    }

    return new Response(JSON.stringify({ 
      message: `Successfully selected and summarized ${processedCount} stocks for ${targetDateStr}`, 
      game_date: targetDateStr,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (err: any) {
    console.error('Fatal Edge Function Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
