import { createClient } from '@supabase/supabase-js'

// 환경 변수 설정
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Gemini API를 이용한 뉴스 및 공시 요약 함수
async function summarizeNewsAndDisclosuresWithGemini(newsItems: any[], disclosureItems: any[], stockName: string): Promise<{ title: string, summary: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  // 프롬프트 작성 (뉴스 및 공시 텍스트를 기반으로 통합 요약 요청)
  let prompt = `다음은 '${stockName}' 주식에 대한 최근 주요 뉴스 및 전자공시 내용입니다. 
뉴스 ${newsItems.length}건과 공시 ${disclosureItems.length}건을 종합하여, 현재 이 종목의 핵심 쟁점과 시장 분위기를 3~4문장으로 아주 명확하고 간결하게 요약해 주세요.
불필요한 수식어는 배제하고 투자자가 참고할 만한 실질적인 정보(호재, 악재, 주요 일정 등) 위주로 작성해 주세요.
또한 이 모든 내용을 포괄하는 실제 뉴스 헤드라인 같은 제목을 1개 생성해 주세요. 이때 제목 끝에 '(요약)'을 붙여주세요.

응답은 반드시 아래 JSON 형식으로만 작성해 주세요:
{
  "title": "{통합된 뉴스 제목 같은 헤드라인} (요약)",
  "summary": "{종합 요약 내용}"
}\n\n`
  
  if (newsItems.length > 0) {
    prompt += `[주요 뉴스]\n`
    newsItems.slice(0, 5).forEach((n, i) => {
      prompt += `${i + 1}. ${n.tit}\n`
    })
    prompt += `\n`
  }

  if (disclosureItems.length > 0) {
    prompt += `[주요 공시]\n`
    disclosureItems.slice(0, 5).forEach((d, i) => {
      prompt += `${i + 1}. ${d.title} (${d.author})\n`
    })
    prompt += `\n`
  }

  // Gemini 1.5 Flash 모델 호출
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
        responseMimeType: "application/json"
      }
    })
  })
 
  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`Gemini API Error (${response.status}):`, errorBody)
    throw new Error(`Gemini API failed: ${response.status}`)
  }
 
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  
  try {
    const parsed = JSON.parse(text)
    return {
      title: parsed.title || `[요약] ${stockName} 주요 이슈 및 공시`,
      summary: parsed.summary || '요약 내용을 생성하지 못했습니다.'
    }
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', text)
    return {
      title: `[요약] ${stockName} 주요 이슈 및 공시`,
      summary: text || '요약 내용을 생성하지 못했습니다.'
    }
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Fetching news summary triggered...')
    
    // 1. 오늘 게임(예측)에 해당하는 5개 종목을 먼저 조회
    // 한국 시간 기준 현재 날짜(YYYY-MM-DD) 구하기
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const todayStr = kstDate.toISOString().split('T')[0];
    
    let { data: dailyStocks, error: dsError } = await supabase
      .from('daily_stocks')
      .select(`
        stock_id,
        stocks ( id, code, name )
      `)
      .eq('game_date', todayStr)

    let targetStocks = []

    // 2. 만약 오늘 지정된 일일 종목이 없다면, fallback으로 최상위 5개 종목 선택
    if (!dailyStocks || dailyStocks.length === 0) {
      console.log(`No daily_stocks found for today (${todayStr}). Falling back to top 5 stocks.`)
      
      const { data: topStocks, error: topError } = await supabase
        .from('stocks')
        .select('id, code, name')
        .order('market_cap_rank', { ascending: true })
        .limit(5)
        
      if (topError) throw topError
      targetStocks = topStocks || []
    } else {
      targetStocks = dailyStocks.map((ds: any) => ds.stocks).filter((s: any) => s !== null)
    }
    
    console.log(`Processing ${targetStocks.length} stocks for news summary...`)
    
    let processedCount = 0
    let errors = []

    // 3. 각 주식 종목마다 뉴스 및 공시 조회 -> 요약 -> DB 삽입 반복
    for (const stock of targetStocks) {
      try {
        console.log(`Fetching News & Disclosures for ${stock.name} (${stock.code})...`)
        
        // 3-1. 네이버 금융 모바일 뉴스 API
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=5`
        const disclosureUrl = `https://m.stock.naver.com/api/stock/${stock.code}/disclosure?pageSize=5&page=1`
        
        const [newsRes, discRes] = await Promise.all([
          fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
          fetch(disclosureUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        ])
        
        let newsItems = []
        if (newsRes.ok) {
          const newsData = await newsRes.json()
          newsItems = newsData?.items || []
        }
        
        let disclosureItems = []
        if (discRes.ok) {
          const discData = await discRes.json()
          disclosureItems = Array.isArray(discData) ? discData : (discData?.items || [])
        }
        
        if (newsItems.length === 0 && disclosureItems.length === 0) {
          console.warn(`No news or disclosures found for ${stock.name}`)
          continue
        }
        
        // 3-2. Gemini를 사용해 통합 요약 생성
        console.log(`Generating summary with Gemini for ${stock.name}...`)
        const { title, summary } = await summarizeNewsAndDisclosuresWithGemini(newsItems, disclosureItems, stock.name)
        
        // 3-3. DB에 요약 결과 저장 (news 테이블)
        const topNews = newsItems[0] || {}
        const publishedDate = topNews.dt ? `${topNews.dt.substring(0, 4)}-${topNews.dt.substring(4, 6)}-${topNews.dt.substring(6, 8)}T${topNews.dt.substring(8, 10)}:${topNews.dt.substring(10, 12)}:00Z` : new Date().toISOString()
        
        const contentLines = [
          ...newsItems.map((n: any) => `[뉴스] ${n.tit}`),
          ...disclosureItems.map((d: any) => `[공시] ${d.title}`)
        ]

        const newsRecord = {
          stock_id: stock.id,
          title: title,
          content: contentLines.join('\n'),
          url: topNews.originLink || `https://m.stock.naver.com/domestic/stock/${stock.code}/news`,
          source: '네이버 시황/뉴스/공시 (Gemini 1.5 Flash 요약)',
          published_at: new Date(publishedDate).toISOString(),
          llm_summary: summary,
          created_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase
          .from('news')
          .insert(newsRecord)
          
        if (insertError) throw insertError
        
        processedCount++
        console.log(`Successfully summarized and saved for ${stock.name} (${stock.code})`)

      } catch (err: any) {
        console.error(`Error processing stock ${stock.name}:`, err.message)
        errors.push({ stock: stock.name, error: err.message })
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Successfully processed news & summarized with Gemini', 
      processedCount,
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
