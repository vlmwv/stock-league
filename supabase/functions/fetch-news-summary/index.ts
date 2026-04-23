import { createClient } from '@supabase/supabase-js'

// 환경 변수 설정
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY_2') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Gemini API를 이용한 뉴스, 공시, IR 통합 요약 함수
async function summarizeNewsAndDisclosuresWithGemini(newsItems: any[], disclosureItems: any[], irItems: any[], stockName: string): Promise<{ title: string, summary: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_2 is not set in Supabase Secrets')
  }

  const primaryItem = irItems[0] || disclosureItems[0] || newsItems[0]
  const primaryTitle = primaryItem ? (primaryItem.title || primaryItem.tit || "") : ""

  const prompt = `당신은 전문 경제 기자입니다. 다음은 '${stockName}' 주식에 대한 최근 주요 뉴스, 전자공시, IR 정보 내용입니다. 
뉴스 ${newsItems.length}건, 공시 ${disclosureItems.length}건, IR ${irItems.length}건을 종합하여, 현재 이 종목의 핵심 쟁점과 시장 분위기를 딱 1문장(최대 50자 내외)으로 아주 명확하고 간결하게 요약해 주세요.
불필요한 수식어는 배제하고 투자자가 참고할 만한 가장 중요한 팩트 위주로 작성해 주세요.
또한 이 내용을 포괄하는 실제 뉴스 헤드라인 같은 제목을 1개 생성해 주세요. 이때 제목 끝에 '(요약)'을 붙여주세요.

[중요 제약 조건]
- 요약(summary)은 반드시 마침표(.)로 끝나는 완결된 한 문장이어야 합니다.
- "${stockName} 주요 이슈", "${stockName} 실시간 요약" 같은 식상하고 반복적인 제목은 절대 금지합니다.
- 실제 언론사에서 낼 법한 구체적이고 임팩트 있는 헤드라인을 만드세요.
- 요약 작성 시 '${stockName}' 이라는 종목명을 문장 처음에 넣지 마세요.
- 응답은 반드시 아래 JSON 형식으로만 작성해 주세요:
{
  "title": "뉴스 제목 (요약)",
  "summary": "1문장 요약 내용."
}
`
  
  let contentList = ""
  if (newsItems.length > 0) {
    contentList += `[주요 뉴스]\n`
    newsItems.slice(0, 5).forEach((n, i) => {
      contentList += `${i + 1}. ${n.title || n.tit}\n`
    })
    contentList += `\n`
  }

  if (disclosureItems.length > 0) {
    contentList += `[주요 공시]\n`
    disclosureItems.slice(0, 5).forEach((d, i) => {
      contentList += `${i + 1}. ${d.title} (${d.author})\n`
    })
    contentList += `\n`
  }

  if (irItems.length > 0) {
    contentList += `[IR 정보]\n`
    irItems.slice(0, 5).forEach((ir, i) => {
      contentList += `${i + 1}. ${ir.title || ir.tit}\n`
    })
    contentList += `\n`
  }

  const fullPrompt = `${prompt}\n\n[목록]\n${contentList}`

  // Gemini 1.5 Flash 모델 호출 (최신 가용 모델 사용 및 JSON 응답 모드 활성화)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        response_mime_type: "application/json"
      }
    })
  })
  
  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`Gemini API Error (${response.status}):`, errorBody)
    throw new Error(`Gemini API failed: ${response.status} - ${errorBody}`)
  }
  
  const data = await response.json()
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  try {
    const parsed = JSON.parse(text)
    return {
      title: parsed.title || `[요약] ${primaryTitle.substring(0, 20)}...`,
      summary: parsed.summary || '요약 내용을 생성하지 못했습니다.'
    }
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', text)
    return {
      title: `[요약] ${primaryTitle.substring(0, 20)}...`,
      summary: text || '요약 내용을 생성하지 못했습니다.'
    }
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Fetching news summary triggered...')
    
    // 1. 오늘 게임(예측)에 해당하는 5개 종목을 먼저 조회
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

    // 2. 만약 오늘 지정된 일일 종목이 없다면 fallback
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

    for (const stock of targetStocks) {
      try {
        console.log(`Fetching News, Disclosures, IR for ${stock.name} (${stock.code})...`)
        
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=5`
        const disclosureUrl = `https://m.stock.naver.com/api/stock/${stock.code}/disclosure?pageSize=5&page=1`
        const irUrl = `https://m.stock.naver.com/api/stock/${stock.code}/irInfo?pageSize=5&page=1`
        
        const [newsRes, discRes, irRes] = await Promise.all([
          fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
          fetch(disclosureUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
          fetch(irUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        ])
        
        let newsItems = []
        if (newsRes.ok) {
          const newsData = await newsRes.json()
          if (Array.isArray(newsData)) {
            newsData.forEach((group: any) => {
              if (group.items && Array.isArray(group.items)) {
                let groupItems = group.items.map((item: any) => ({...item, clusterSize: group.total || 1}));
                newsItems.push(...groupItems)
              }
            })
            newsItems.sort((a, b) => b.clusterSize - a.clusterSize || b.datetime?.localeCompare(a.datetime) || 0)
            newsItems = newsItems.slice(0, 5)
          } else {
            newsItems = newsData?.items || []
          }
        }
        
        let disclosureItems = []
        if (discRes.ok) {
          const discData = await discRes.json()
          disclosureItems = Array.isArray(discData) ? discData : (discData?.items || [])
        }

        let irItems = []
        if (irRes.ok) {
          const irData = await irRes.json()
          irItems = irData?.items || []
        }
        
        if (newsItems.length === 0 && disclosureItems.length === 0 && irItems.length === 0) {
          console.warn(`No news, disclosures or IR found for ${stock.name}`)
          continue
        }
        
        console.log(`Generating summary for ${stock.name}...`)
        const { title, summary } = await summarizeNewsAndDisclosuresWithGemini(newsItems, disclosureItems, irItems, stock.name)
        
        const topNews = newsItems[0] || {}
        const topDisc = disclosureItems[0] || {}
        const topIr = irItems[0] || {}
        
        // 날짜 파싱 및 검증 로직 개선
        let published_at = new Date().toISOString()
        const dt = topNews.dt || ""
        if (dt && dt.length >= 10) {
          try {
            published_at = `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}T${dt.substring(8, 10)}:${dt.substring(10, 12) || '00'}:00Z`
            // 유효성 확인
            new Date(published_at).toISOString()
          } catch (e) {
            published_at = new Date().toISOString()
          }
        }
        
        let finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/news`
        let type: 'news' | 'notice' | 'ir' = 'news'

        if (irItems.length > 0) {
          type = 'ir'
          const boardId = topIr.boardId || topIr.irInfoId || topIr.id
          finalUrl = boardId 
            ? `https://m.stock.naver.com/domestic/stock/${stock.code}/ir/${boardId}`
            : `https://m.stock.naver.com/domestic/stock/${stock.code}/ir`
        } else if (disclosureItems.length > 0) {
          type = 'notice'
          const articleId = topDisc.articleId || topDisc.id
          finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/notice/${articleId}`
        } else if (newsItems.length > 0) {
          type = 'news'
          const officeId = topNews.officeId || topNews.oid
          const articleId = topNews.articleId || topNews.aid
          if (officeId && articleId) {
            finalUrl = `https://n.news.naver.com/article/${officeId}/${articleId}`
          } else if (topNews.mobileNewsUrl) {
            finalUrl = topNews.mobileNewsUrl
          }
        }

        const contentLines = [
          ...newsItems.map((n: any) => `[뉴스] ${n.title || n.tit}`),
          ...disclosureItems.map((d: any) => `[공시] ${d.title}`),
          ...irItems.map((ir: any) => `[IR] ${ir.title || ir.tit}`)
        ]

        const newsRecord = {
          stock_id: stock.id,
          title: title,
          content: contentLines.join('\n'),
          url: finalUrl,
          source: '네이버 시황/뉴스/공시/IR (Gemini 1.5 Flash 요약)',
          published_at: published_at,
          llm_summary: summary,
          type: type,
          created_at: new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('news')
          .insert(newsRecord)
          
        if (insertError) throw insertError
        processedCount++

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
