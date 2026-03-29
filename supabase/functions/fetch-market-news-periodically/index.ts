import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function summarizeWithGemini(items: any[], stockName: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')

  const prompt = `다음은 '${stockName}' 주식의 최신 뉴스/공시 목록입니다. 
가장 중요한 핵심 내용 1가지를 골라 1~2문장으로 아주 짧고 강렬하게 요약해 주세요. 
사용자가 이 정보를 보고 '찜'하거나 '예측'에 참고할 수 있도록 흥미를 유발하는 문체로 작성해 주세요.

[목록]
${items.map((item, i) => `${i + 1}. ${item.title || item.tit}`).join('\n')}
`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
    })
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error(`Gemini API Error (${response.status}):`, errBody)
    // 디버깅을 위해 에러 본문을 포함한 에러 던지기
    throw new Error(`Gemini API failed (${response.status}): ${errBody}`)
  }
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '요약을 생성할 수 없습니다.'
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

      const [newsRes, discRes] = await Promise.all([
        fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch(discUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      ])

      const newsData = await newsRes.json()
      const discData = await discRes.json()

      const newsItems = newsData?.items || []
      const discItems = Array.isArray(discData) ? discData : (discData?.items || [])
      const allItems = [...newsItems, ...discItems]

      if (allItems.length === 0) continue

      // TODO: 기존에 수집된 뉴스인지 체크 (URL 등으로)
      // 여기서는 최신 요약을 news 테이블에 업데이트하거나 삽입
      const summary = await summarizeWithGemini(allItems, stock.name)

      const { error: insertError } = await supabase
        .from('news')
        .upsert({
          stock_id: stock.id,
          title: `[실시간 요약] ${stock.name} 주요 이슈`,
          llm_summary: summary,
          url: `https://m.stock.naver.com/domestic/stock/${stock.code}/news`,
          source: 'Naver Finance (AI Summary)',
          published_at: new Date().toISOString()
        }, { onConflict: 'stock_id, title' }) // 예시 목적의 제약조건

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
