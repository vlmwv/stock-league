import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function buildFallbackSummary(items: any[], stockName: string): { title: string, summary: string, score: number } {
  const first = items[0] || {}
  const second = items[1] || {}
  const rawTitle1 = String(first.title || first.tit || '').trim()
  const rawTitle2 = String(second.title || second.tit || '').trim()

  const baseTitle = rawTitle1 || `${stockName} 뉴스 업데이트`
  const title = `${baseTitle.substring(0, 22)}${baseTitle.length > 22 ? '...' : ''} (요약)`

  if (rawTitle1 && rawTitle2) {
    return {
      title,
      summary: `${rawTitle1} 이슈가 핵심이며, 추가로 ${rawTitle2} 관련 흐름도 함께 확인이 필요합니다.`,
      score: 50
    }
  }

  if (rawTitle1) {
    return {
      title,
      summary: `${rawTitle1} 관련 이슈가 확인되었습니다. 단기 변동성 확대 가능성을 점검하세요.`,
      score: 50
    }
  }

  return {
    title,
    summary: `${stockName} 뉴스 업데이트가 확인되었습니다.`,
    score: 50
  }
}

async function summarizeWithGemini(items: any[], stockName: string): Promise<{ title: string, summary: string, score: number, is_significant: boolean }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')

  // 첫 번째 항목(가장 임팩트 있는 항목)을 주 대상으로 정보 요약
  const primaryItem = items[0]
  const primaryTitle = primaryItem.title || primaryItem.tit || ""

  const prompt = `당신은 전문 경제 기자이자 주식 분석가입니다. 다음은 '${stockName}' 주식의 최신 뉴스/공시 목록입니다. 

[분석 및 요약 지침]
1. 최신 이슈 중 주가에 실질적이고 큰 영향을 줄 핵심 내용 1가지를 선정하세요.
2. 해당 내용을 바탕으로 실제 뉴스 헤드라인 같은 제목(25자 이내)을 만드세요. 제목 끝에는 반드시 '(요약)'을 붙이세요.
3. 핵심 내용을 1~2문장으로 아주 짧고 강렬하게 요약하세요.
4. 해당 뉴스가 당일 또는 익일 주가에 미칠 긍정적 영향(상승 확률/강도)을 0~100점 사이의 점수로 산출하세요.
   - 100점에 가까울수록 강력한 호재, 0점에 가까울수록 강력한 악재입니다.
5. **(중요) 중요도 판별(is_significant)**:
   - 다음의 경우에만 true로 설정하세요: 실적 발표(어닝 서프라이즈/쇼크), 대규모 공급계약, M&A, 신사업 진출, 특허/임상 결과, 주요 규제/소송, 혹은 주가 추세를 바꿀만한 강력한 이슈.
   - 단순 시황 중계, 일반적인 증권사 워딩 리포트, 일상적인 뉴스, 혹은 이미 반영된 정보라면 false로 설정하세요.

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "{생성한 제목} (요약)",
  "summary": "{핵심 요약 내용}",
  "score": {0~100 사이의 숫자},
  "is_significant": {true 또는 false}
}

[목록]
${items.map((item, i) => `${i + 1}. ${item.title || item.tit}`).join('\n')}
`

  // 최신 모델 우선, 실패 시 레거시 모델로 1회 폴백
  const candidateModels = ['gemini-flash-latest', 'gemini-2.0-flash']
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
          maxOutputTokens: 300,
          response_mime_type: "application/json"
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
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}'
  
  // 마크다운 코드 블록 제거 로직 추가 (```json ... ``` 또는 ``` ... ```)
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    // 1. 더 강력한 JSON 추출: 첫 번째 { 와 마지막 } 사이의 내용만 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const parsed = JSON.parse(text)
    let finalTitle = parsed.title || ""
    let finalSummary = parsed.summary || ""
    let isSignificant = parsed.is_significant === true
    
    // 2. 점수 타입 변환 강화 (문자열인 경우 숫자로 변환)
    let finalScore = 50;
    if (parsed.score !== undefined) {
      finalScore = Number(parsed.score);
      if (isNaN(finalScore)) finalScore = 50;
    }

    // 만약 제목이 비어있거나 너무 단순하면 원문 제목 활용
    if (!finalTitle || finalTitle.includes('주요 이슈') || finalTitle.includes('실시간 요약')) {
      finalTitle = `${primaryTitle.substring(0, 20)}${primaryTitle.length > 20 ? '...' : ''} (요약)`
    }

    return {
      title: finalTitle,
      summary: finalSummary || '요약을 생성할 수 없습니다.',
      score: finalScore,
      is_significant: isSignificant
    }
  } catch (e) {
    console.error(`JSON Parse Error for ${stockName}:`, text);
    // 에러 발생 시 로그에 원문 기록 (나중에 확인 가능하도록)
    throw new Error(`[JSON_PARSE_ERROR] Raw Text: ${text.substring(0, 100)}... Error: ${e.message}`);
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

    // 0. 특정 종목 코드 또는 수집 개수 요청이 있는지 확인 (수동 트리거/테스트 용도)
    let requestedStockCode: string | null = null;
    let manualTargetCount: number | null = null;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        requestedStockCode = body.stockCode || null;
        manualTargetCount = body.targetCount || null;
      }
    } catch (e) {
      console.log('No valid JSON body found or not a POST request. Processing random stocks.');
    }

    // 1. 시가총액 상위 300개 종목 조회 (변동성 종목을 찾기 위해 범위 확대)
    let query = supabase
      .from('stocks')
      .select('id, code, name, change_rate');
    
    if (requestedStockCode) {
      query = query.eq('code', requestedStockCode);
    } else {
      query = query.lte('market_cap_rank', 300);
    }

    const { data: stocks, error: stockError } = await query;

    if (stockError) throw stockError
    if (!stocks || stocks.length === 0) throw new Error('No stocks found')

    let processedCount = 0
    let savedCount = 0
    let skippedCount = 0
    
    // 현재 KST(한국 시간) 기준 시간 구하기 (Edge Function은 기본 UTC 환경)
    const kstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
    const kstHour = kstNow.getUTCHours();
    
    // 시간대에 따른 수집 종목 수 결정
    const targetLimit = manualTargetCount || ((kstHour >= 8 && kstHour < 20) ? 8 : 2);
    
    console.log(`[KST ${kstHour}:00] Target collection count set to: ${targetLimit}`);

    // 2. 종목 선정 (Strategy 5: Technical Trigger)
    let targetStocks = []
    if (requestedStockCode) {
      targetStocks = stocks
    } else {
      // 변동성(절대값) 기준 정렬
      const volatileStocks = [...stocks].sort((a, b) => Math.abs(b.change_rate || 0) - Math.abs(a.change_rate || 0))
      
      // 상위 변동성 종목 70% + 랜덤 30% 조합
      const highVolatilityCutoff = Math.floor(targetLimit * 0.7)
      const randomCutoff = targetLimit - highVolatilityCutoff
      
      targetStocks = volatileStocks.slice(0, highVolatilityCutoff)
      
      const remainingStocks = volatileStocks.slice(highVolatilityCutoff)
      const randomStocks = remainingStocks.sort(() => 0.5 - Math.random()).slice(0, randomCutoff)
      
      targetStocks = [...targetStocks, ...randomStocks]
    }
    
    console.log(`Selected target stocks: ${targetStocks.map(s => `${s.name}(${s.change_rate}%)`).join(', ')}`);

    for (const stock of targetStocks) {
      const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=3`

      const [newsRes] = await Promise.all([
        fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      ])

      const newsData = await newsRes.json()

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

      // 개별 상세 URL 생성을 위한 헬퍼 로직
      let finalUrl = `https://m.stock.naver.com/domestic/stock/${stock.code}/news`
      let type: 'news' = 'news'
      let primaryItem: any = null

      const latestNewsItem = newsItems[0]

      if (latestNewsItem) {
        primaryItem = latestNewsItem
        const officeId = primaryItem.officeId || primaryItem.oid
        const articleId = primaryItem.articleId || primaryItem.aid
        if (officeId && articleId) {
          finalUrl = `https://n.news.naver.com/article/${officeId}/${articleId}`
        } else if (primaryItem.mobileNewsUrl) {
          finalUrl = primaryItem.mobileNewsUrl
        }
      }

      const allItems = newsItems
      if (allItems.length === 0) continue

      let title = ''
      let summary = ''
      let score = 50
      let isSignificant = true

      try {
        const summarized = await summarizeWithGemini(allItems, stock.name)
        title = summarized.title
        summary = summarized.summary
        score = summarized.score
        isSignificant = summarized.is_significant
      } catch (summaryError) {
        // LLM 장애가 있어도 수집 자체는 지속되어야 하므로 기본 요약으로 저장 (단, 수동 모드 등에서만 권장)
        const fallback = buildFallbackSummary(allItems, stock.name)
        title = fallback.title
        summary = fallback.summary
        score = fallback.score
        isSignificant = true // 폴백 시에는 일단 중요하다고 간주하여 저장
        console.warn(`Summary fallback applied for ${stock.code}:`, summaryError)
      }

      // Strategy 4: 중요도가 낮은 기사는 DB 저장 스킵
      if (!isSignificant && !requestedStockCode) {
        console.log(`Skipping non-significant news for ${stock.name}: ${title}`);
        skippedCount++
        processedCount++
        continue
      }

      const { error: insertError } = await supabase
        .from('news')
        .upsert({
          stock_id: stock.id,
          title: title,
          llm_summary: summary,
          ai_score: score,
          url: finalUrl,
          type: type,
          source: '네이버 뉴스 (Gemini 요약)',
          published_at: new Date().toISOString()
        }, { onConflict: 'stock_id, title' })

      if (!insertError) {
        processedCount++
        savedCount++
      }
    }

    // 로그 종료 기록
    if (logEntryId) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: processedCount,
          message: `Processed ${processedCount} stocks. Saved: ${savedCount}, Skipped: ${skippedCount}`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    }

    return new Response(JSON.stringify({ 
      message: `Processed news. Saved: ${savedCount}, Skipped: ${skippedCount}`,
      savedCount,
      skippedCount
    }), {
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
