import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function buildFallbackSummary(items: any[], stockName: string, type: 'news' | 'ir'): { title: string, summary: string } {
  const first = items[0] || {}
  const second = items[1] || {}
  const rawTitle1 = String(first.title || first.tit || '').trim()
  const rawTitle2 = String(second.title || second.tit || '').trim()

  const baseTitle = rawTitle1 || `${stockName} ${type === 'ir' ? 'IR' : '뉴스'} 업데이트`
  const title = `${baseTitle.substring(0, 22)}${baseTitle.length > 22 ? '...' : ''} (요약)`

  if (rawTitle1 && rawTitle2) {
    return {
      title,
      summary: `${rawTitle1} 이슈가 핵심이며, 추가로 ${rawTitle2} 관련 흐름도 함께 확인이 필요합니다.`
    }
  }

  if (rawTitle1) {
    return {
      title,
      summary: `${rawTitle1} 관련 이슈가 확인되었습니다. 세부 공시/원문 내용을 기준으로 단기 변동성 확대 가능성을 점검하세요.`
    }
  }

  return {
    title,
    summary: `${stockName} ${type === 'ir' ? 'IR' : '뉴스'} 업데이트가 확인되었습니다.`
  }
}

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

  // 최신 모델 우선, 실패 시 레거시 모델로 1회 폴백
  const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash-latest']
  let response: Response | null = null
  let lastErrorBody = ''

  for (const model of candidateModels) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
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

    if (response.ok) break
    lastErrorBody = await response.text()
    console.warn(`Gemini model fallback triggered (${model}):`, response.status)
  }

  if (!response || !response.ok) {
    console.error(`Gemini API Error (${response?.status ?? 'N/A'}):`, lastErrorBody)
    throw new Error(`Gemini API failed (${response?.status ?? 'N/A'}): ${lastErrorBody}`)
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
  const startTime = new Date().toISOString()
  let logEntryId: string | null = null

  try {
    console.log('Periodic market news collection started... (v1.0.1)')
    
    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'fetch-market-news-periodically',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    
    if (logEntry) logEntryId = logEntry.id

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
      const irUrl = `https://m.stock.naver.com/api/stock/${stock.code}/irInfo?pageSize=3&page=1`

      const [newsRes, irRes] = await Promise.all([
        fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
        fetch(irUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      ])

      const newsData = await newsRes.json()
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

      const irItems = Array.isArray(irData) ? irData : (irData?.items || [])
      
      // 개별 상세 URL 생성을 위한 헬퍼 로직
      let finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/news`
      let type: 'news' | 'ir' = 'news'
      let primaryItem: any = null

      const latestNewsItem = newsItems[0]
      const latestIrItem = irItems[0]
      const latestNewsAt = latestNewsItem?.datetime ? new Date(latestNewsItem.datetime).getTime() : 0
      const latestIrAt = latestIrItem?.writeDate ? new Date(latestIrItem.writeDate).getTime() : 0

      // 최신 시각 기준으로 타입 결정 (뉴스가 최신이면 뉴스 아이콘 유지)
      if (latestIrItem && latestIrAt > latestNewsAt) {
        type = 'ir'
        primaryItem = latestIrItem
        const boardId = primaryItem.boardId || primaryItem.irInfoId || primaryItem.id
        finalUrl = boardId
          ? `https://m.stock.naver.com/domestic/stock/${stock.code}/ir/${boardId}`
          : `https://m.stock.naver.com/domestic/stock/${stock.code}/ir`
      } else if (latestNewsItem) {
        type = 'news'
        primaryItem = latestNewsItem
        const officeId = primaryItem.officeId || primaryItem.oid
        const articleId = primaryItem.articleId || primaryItem.aid
        if (officeId && articleId) {
          finalUrl = `https://n.news.naver.com/article/${officeId}/${articleId}`
        } else if (primaryItem.mobileNewsUrl) {
          finalUrl = primaryItem.mobileNewsUrl
        }
      } else if (latestIrItem) {
        type = 'ir'
        primaryItem = latestIrItem
        const boardId = primaryItem.boardId || primaryItem.irInfoId || primaryItem.id
        finalUrl = boardId
          ? `https://m.stock.naver.com/domestic/stock/${stock.code}/ir/${boardId}`
          : `https://m.stock.naver.com/domestic/stock/${stock.code}/ir`
      }

      const allItems = type === 'ir' ? [...irItems, ...newsItems] : [...newsItems, ...irItems]
      if (allItems.length === 0) continue

      let title = ''
      let summary = ''
      try {
        const summarized = await summarizeWithGemini(allItems, stock.name)
        title = summarized.title
        summary = summarized.summary
      } catch (summaryError) {
        // LLM 장애가 있어도 수집 자체는 지속되어야 하므로 기본 요약으로 저장
        const fallback = buildFallbackSummary(allItems, stock.name, type)
        title = fallback.title
        summary = fallback.summary
        console.warn(`Summary fallback applied for ${stock.code}:`, summaryError)
      }

      const { error: insertError } = await supabase
        .from('news')
        .upsert({
          stock_id: stock.id,
          title: title,
          llm_summary: summary,
          url: finalUrl,
          type: type,
          source: '네이버 시황/뉴스/IR (Gemini 요약)',
          published_at: new Date().toISOString()
        }, { onConflict: 'stock_id, title' })

      if (!insertError) processedCount++
    }

    // 로그 종료 기록
    if (logEntryId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: processedCount,
          message: `Successfully processed news for ${processedCount} stocks`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    }

    return new Response(JSON.stringify({ message: `Processed news for ${processedCount} stocks` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('Periodic news collection error:', err.message)
    if (logEntryId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    } else {
      // 로그 엔트리가 생성되지 않은 경우 (시작 단계에서 에러 등)
      await supabase
        .from('batch_execution_logs')
        .insert({
          function_name: 'fetch-market-news-periodically',
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
    }

    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
