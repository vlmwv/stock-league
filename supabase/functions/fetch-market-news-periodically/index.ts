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
- 독자의 시선을 끌 수 있도록 구체적인 수치나 핵심 키워드를 포함한 임팩트 있는 실제 뉴스 제목을 만드세요.
- 제목은 25자 이내로 작성해 주세요.

응답은 반드시 아래 형식으로만 작성해 주세요:
제목: {실제 뉴스 제목 같은 헤드라인} (요약)
요약: {핵심 요약 내용}

[목록]
${items.map((item, i) => `${i + 1}. ${item.title || item.tit}`).join('\n')}
`

  // Gemini 1.5 Flash 모델 호출
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.3, 
        maxOutputTokens: 250
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
  
  let finalTitle = ""
  let finalSummary = ""
  
  if (text.includes('제목:')) {
    finalTitle = text.split('제목:')[1].split('\n')[0].trim()
    if (text.includes('요약:')) {
      finalSummary = text.split('요약:')[1].trim()
    }
  } else {
    finalSummary = text
  }

  // 만약 제목이 비어있으면 원문 제목 활용
  if (!finalTitle || finalTitle.includes('주요 이슈') || finalTitle.includes('실시간 요약')) {
    finalTitle = `${primaryTitle.substring(0, 20)}${primaryTitle.length > 20 ? '...' : ''} (요약)`
  }

  return {
    title: finalTitle,
    summary: finalSummary || '요약을 생성할 수 없습니다.'
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Periodic market news collection started... (v1.0.1)')
    
    // 0. 특정 종목 코드 요청이 있는지 확인 (수동 트리거 용도)
    let requestedStockCode: string | null = null;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        requestedStockCode = body.stockCode || null;
      }
    } catch (e) {
      console.log('No valid JSON body found or not a POST request. Processing random stocks.');
    }

    // 1. 시가총액 상위 100개 종목 조회
    let query = supabase
      .from('stocks')
      .select('id, code, name');
    
    if (requestedStockCode) {
      query = query.eq('code', requestedStockCode);
    } else {
      query = query.lte('market_cap_rank', 100);
    }

    const { data: stocks, error: stockError } = await query;

    if (stockError) throw stockError
    if (!stocks || stocks.length === 0) throw new Error('No stocks found')

    let processedCount = 0
    
    // 2. 종목 선정
    // 특정 종목 요청 시 해당 종목만 처리, 아닐 시 무작위 3개 처리
    const targetStocks = requestedStockCode 
      ? stocks 
      : stocks.sort(() => 0.5 - Math.random()).slice(0, 3);

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

      // 최신 API 스펙: 여러 언론사가 모인 묶음(Cluster) 뉴스는 배열 요소 안의 items 배열에 들어있음
      let newsItems = []
      if (Array.isArray(newsData)) {
        // [{ items: [...] }, ...] 형태 평탄화. 만약 total > 1 인 주요 뉴스 묶음이 있으면 전체 요약 품질을 높일 수 있음.
        newsData.forEach((group: any) => {
          if (group.items && Array.isArray(group.items)) {
            // total(묶인 기사 수)가 큰 것을 앞으로 당기도록 가중치 정렬 시도 가능
            let groupItems = group.items.map((item: any) => ({...item, clusterSize: group.total || 1}));
            newsItems.push(...groupItems)
          }
        })
        // 클러스터 크기가 큰 주요 뉴스를 상단으로 배치 후 최신순 정렬 보정
        newsItems.sort((a, b) => b.clusterSize - a.clusterSize || b.datetime?.localeCompare(a.datetime) || 0)
        // 5개로 제한
        newsItems = newsItems.slice(0, 5)
      } else {
        newsItems = newsData?.items || []
      }

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
        // 클러스터링된 주요 뉴스가 있다면 그것을 우선시 (배열 내 객체의 total 값이 영향을 주지만 이미 평탄화되었으므로)
        // items 속성 내부 객체 사용 시 officeId, articleId 사용 (최신 API 스펙 반영)
        primaryItem = newsItems[0]
        const officeId = primaryItem.officeId || primaryItem.oid
        const articleId = primaryItem.articleId || primaryItem.aid
        if (officeId && articleId) {
          finalUrl = `https://n.news.naver.com/article/${officeId}/${articleId}`
        } else if (primaryItem.mobileNewsUrl) {
          finalUrl = primaryItem.mobileNewsUrl
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
           source: '네이버 시황/뉴스/공시/IR (Gemini 1.5 Flash 요약)',
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
