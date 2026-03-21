import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 환경 변수 설정
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Gemini API를 이용한 뉴스 요약 함수
async function summarizeNewsWithGemini(newsItems: any[], stockName: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  // 프롬프트 작성 (최대 5건의 뉴스 텍스트를 기반으로 요약 요청)
  let prompt = `다음은 '${stockName}' 주식에 대한 최근 주요 뉴스들입니다. 핵심만 3~4문장으로 간결하게 요약해 주세요. 개별 뉴스의 나열보다는 전체적인 흐름과 시장의 평가(호재/악재 등) 위주로 자연스럽게 요약해 주세요.\n\n`
  
  newsItems.slice(0, 5).forEach((n, i) => {
    // Naver News API 응답 구조: 기사 제목(tit)과 내용 일부(subcontent)
    prompt += `${i + 1}. 제목: ${n.tit}\n내용: ${n.subcontent}\n\n`
  })

  // Gemini 1.5 Flash 모델 호출
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API Error:', errorText)
    throw new Error(`Gemini API failed: ${response.status}`)
  }

  const data = await response.json()
  const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  return summaryText || '요약 내용을 생성하지 못했습니다.'
}

Deno.serve(async (req) => {
  try {
    console.log('Fetching news summary triggered...')
    
    // 1. 오늘 게임(예측)에 해당하는 5개 종목을 먼저 조회
    const todayStr = new Date().toISOString().split('T')[0]
    
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

    // 3. 각 주식 종목마다 뉴스 조회 -> 요약 -> DB 삽입 반복
    for (const stock of targetStocks) {
      try {
        console.log(`Fetching Naver News for ${stock.name} (${stock.code})...`)
        // 3-1. 네이버 금융 모바일 뉴스 API (JSON 응답)
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=5`
        const newsRes = await fetch(newsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        
        if (!newsRes.ok) {
          throw new Error(`Failed to fetch Naver news (HTTP ${newsRes.status})`)
        }
        
        const newsData = await newsRes.json()
        const newsItems = newsData?.items || []
        
        if (newsItems.length === 0) {
          console.warn(`No news found for ${stock.name}`)
          continue
        }
        
        // 3-2. Gemini를 사용해 요약 생성
        console.log(`Generating summary with Gemini for ${stock.name}...`)
        const summary = await summarizeNewsWithGemini(newsItems, stock.name)
        
        // 3-3. DB에 요약 결과 저장 (news 테이블)
        const topNews = newsItems[0]
        const publishedDate = topNews.dt ? `${topNews.dt.substring(0, 4)}-${topNews.dt.substring(4, 6)}-${topNews.dt.substring(6, 8)}T${topNews.dt.substring(8, 10)}:${topNews.dt.substring(10, 12)}:00Z` : new Date().toISOString()
        
        const newsRecord = {
          stock_id: stock.id,
          title: `[요약] ${stock.name} 최근 쟁점 (총 ${newsItems.length}건 기사 기반)`,
          content: newsItems.map((n: any) => `- ${n.tit}`).join('\n'),
          url: topNews.originLink || `https://m.stock.naver.com/domestic/stock/${stock.code}/news`,
          source: '네이버 시황/뉴스 (Gemini 1.5 Flash 요약)',
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
