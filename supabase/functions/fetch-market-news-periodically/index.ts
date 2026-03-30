import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function summarizeWithGemini(items: any[], stockName: string): Promise<{ title: string, summary: string }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')

  // 첫 번째 항목(가장 임팩트 있는 항목)을 주 대상으로 정보 요약
  const primaryItem = items[0]
  const primaryTitle = primaryItem.title || primaryItem.tit || ""

  const prompt = `당신은 전문 경제 기자입니다. 다음은 '${stockName}' 주식의 최신 뉴스/공시 목록입니다. 
가장 중요한 핵심 내용 1가지를 골라 1~2문장으로 아주 짧고 강렬하게 요약해 주세요. 
또한 이 내용을 잘 나타내는 실제 뉴스 헤드라인 같은 제목을 1개 생성해 주세요. 이때 제목 끝에 '(요약)'을 붙여주세요.

[중요 제약 조건]
- "${stockName} 주요 이슈", "${stockName} 실시간 요약" 같이 단순하고 반복적인 제목은 절대 사용하지 마세요.
- 독자의 시선을 끌 수 있도록 구체적인 수치나 핵심 키워드를 포함한 임팩트 있는 제목을 만드세요.
- 제목은 25자 이내로 작성해 주세요.

응답은 반드시 아래 JSON 형식으로만 작성해 주세요:
{
  "title": "{실제 뉴스 제목 같은 헤드라인} (요약)",
  "summary": "{핵심 요약 내용}"
}

[목록]
${items.map((item, i) => `${i + 1}. ${item.title || item.tit}`).join('\n')}
`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.3, 
        maxOutputTokens: 250,
        responseMimeType: "application/json"
      }
    })
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error(`Gemini API Error (${response.status}):`, errBody)
    throw new Error(`Gemini API failed (${response.status}): ${errBody}`)
  }
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  
  try {
    const parsed = JSON.parse(text)
    return {
      title: parsed.title || `[실시간 요약] ${primaryTitle.substring(0, 20)}...`,
      summary: parsed.summary || '요약을 생성할 수 없습니다.'
    }
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', text)
    return {
      title: `[실시간 요약] ${primaryTitle.substring(0, 20)}...`,
      summary: text || '요약을 생성할 수 없습니다.'
    }
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Periodic market news collection started...')

    // 1. 시가총액 상위 100개 종목 조회
    const { data: stocks, error: stockError } = await supabase
      .from('stocks')
      .select('id, code, name')
      .lte('market_cap_rank', 100)

    if (stockError) throw stockError
    if (!stocks) throw new Error('No stocks found')

    let processedCount = 0
    
    // 2. 각 종목별 최신 뉴스/공시 확인
    // Gemini API Rate Limit (분당 5~15회) 방지를 위해 한 번 실행할 때마다 3개 종목만 무작위로 처리
    const targetStocks = stocks.sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const stock of targetStocks) {
      const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=3`
      const discUrl = `https://m.stock.naver.com/api/stock/${stock.code}/disclosure?pageSize=3&page=1`
      const irUrl = `https://m.stock.naver.com/api/stock/${stock.code}/irInfo?pageSize=3&page=1`

      const [newsRes, discRes, irRes] = await Promise.all([
        fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch(discUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch(irUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      ])

      const newsData = await newsRes.json()
      const discData = await discRes.json()
      const irData = await irRes.json()

      const newsItems = newsData?.items || []
      const discItems = Array.isArray(discData) ? discData : (discData?.items || [])
      const irItems = irData?.items || []
      
      // 개별 상세 URL 생성을 위한 헬퍼 로직
      let finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/news`
      let type: 'news' | 'notice' | 'ir' = 'news'
      let primaryItem: any = null

      if (irItems.length > 0) {
        type = 'ir'
        primaryItem = irItems[0]
        const boardId = primaryItem.boardId || primaryItem.id
        finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/ir/${boardId}`
      } else if (discItems.length > 0) {
        type = 'notice'
        primaryItem = discItems[0]
        const articleId = primaryItem.articleId || primaryItem.id
        finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/notice/${articleId}`
      } else if (newsItems.length > 0) {
        type = 'news'
        primaryItem = newsItems[0]
        const oid = primaryItem.oid
        const aid = primaryItem.aid
        if (oid && aid) {
          finalUrl = `https://n.news.naver.com/article/${oid}/${aid}`
        }
      }

      const allItems = [...newsItems, ...discItems, ...irItems]
      if (allItems.length === 0) continue

      const { title, summary } = await summarizeWithGemini(allItems, stock.name)

      const { error: insertError } = await supabase
        .from('news')
        .upsert({
          stock_id: stock.id,
          title: title,
          llm_summary: summary,
          url: finalUrl,
          type: type,
          source: 'Naver Finance (AI Summary)',
          published_at: new Date().toISOString()
        }, { onConflict: 'stock_id, title' })

      if (!insertError) processedCount++
    }

    return new Response(JSON.stringify({ message: `Processed news for ${processedCount} stocks` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
