import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function buildFallbackSummary(items: any[], stockName: string): { title: string, summary: string, score: number } {
  const first = items[0] || {}
  const rawTitle = String(first.title || first.tit || '').trim()
  const baseTitle = rawTitle || `${stockName} IR 업데이트`
  const title = `${baseTitle.substring(0, 22)}${baseTitle.length > 22 ? '...' : ''} (요약)`
  return {
    title,
    summary: rawTitle ? `${rawTitle} 관련 IR 내용이 확인되었습니다.` : `${stockName} IR 업데이트가 있습니다.`,
    score: 50
  }
}

async function summarizeWithGemini(items: any[], stockName: string): Promise<{ title: string, summary: string, score: number }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')
  const primaryItem = items[0]
  const primaryTitle = primaryItem.title || primaryItem.tit || ''
  const prompt = `당신은 전문 경제 기자이자 주식 분석가입니다. 다음은 '${stockName}' 주식의 최신 IR(Investor Relations) 목록입니다.

[분석 및 요약 지침]
1. 최신 IR 내용 중 주가에 가장 큰 영향을 줄 핵심 내용 1가지를 선정하세요.
2. 해당 내용을 바탕으로 실제 뉴스 헤드라인 같은 제목(25자 이내)을 만드세요. 제목 끝에는 반드시 '(요약)'을 붙이세요.
3. 핵심 내용을 1~2문장으로 아주 짧고 강렬하게 요약하세요.
4. 해당 정보가 당일 또는 익일 주가에 미칠 긍정적 영향(상승 확률/강도)을 0~100점 사이의 점수로 산출하세요. 
   - 100점에 가까울수록 강력한 호재, 0점에 가까울수록 강력한 악재입니다.
   - [중요] 45~55점 사이의 '중립' 점수 남발을 지양하고, 시장의 예측되는 반응을 과감하게 수치화하세요.

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "{생성한 제목} (요약)",
  "summary": "{핵심 요약 내용}",
  "score": {0~100 사이의 숫자}
}

[제약 조건]
- "${stockName} IR" 같은 단순 제목 금지. 구체적인 수치나 키워드 중심의 임팩트 있는 제목 생성.

[목록]
${items.map((item, i) => `${i + 1}. ${item.title || item.tit}`).join('\n')}`

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
    let finalTitle = parsed.title || ''
    let finalSummary = parsed.summary || ''
    
    // 2. 점수 타입 변환 강화 (문자열인 경우 숫자로 변환)
    let finalScore = 50;
    if (parsed.score !== undefined) {
      finalScore = Number(parsed.score);
      if (isNaN(finalScore)) finalScore = 50;
    }

    if (!finalTitle || finalTitle.includes('IR')) {
      finalTitle = `${primaryTitle.substring(0, 20)}${primaryTitle.length > 20 ? '...' : ''} (요약)`
    }

    return {
      title: finalTitle,
      summary: finalSummary || '요약을 생성할 수 없습니다.',
      score: finalScore
    }
  } catch (e) {
    return {
      title: `${primaryTitle.substring(0, 20)}... (요약)`,
      summary: 'IR 정보를 분석 중입니다.',
      score: 50
    }
  }
}

Deno.serve(async (req) => {
  const startTime = new Date().toISOString()
  let logEntryId: string | null = null

  try {
    console.log('Periodic IR collection started...')

    // 0. 수동 수집 개수 요청 확인
    let manualTargetCount: number | null = null;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        manualTargetCount = body.targetCount || null;
      }
    } catch (e) {
      console.log('No valid JSON body found or not a POST request.');
    }

    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'fetch-ir',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    
    if (logEntry) logEntryId = logEntry.id

    // 1. 전체 종목 조회 (상위 100 혹은 전체) 여기서는 전체 조회
    const { data: stocks, error: stockError } = await supabase.from('stocks').select('id, code, name')
    if (stockError) throw stockError
    if (!stocks || stocks.length === 0) throw new Error('No stocks found')
    let processedCount = 0;
    
    // 현재 KST(한국 시간) 기준 시간 구하기 (Edge Function은 기본 UTC 환경)
    const kstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
    const kstHour = kstNow.getUTCHours();
    
    // 시간대에 따른 수집 종목 수 결정
    // 주간 활성기(08:00 ~ 20:00 KST): 6개 종목
    // 야간/새벽(20:00 ~ 익일 08:00 KST): 1개 종목
    // 단, 요청 본문에 targetCount가 명시된 경우 이를 우선적으로 사용합니다.
    const targetCount = manualTargetCount || ((kstHour >= 8 && kstHour < 20) ? 6 : 1);
    
    console.log(`[KST ${kstHour}:00] Target IR collection count set to: ${targetCount}`);

    // 무작위 종목 선택
    const targetStocks = stocks.sort(() => 0.5 - Math.random()).slice(0, targetCount);
    for (const stock of targetStocks) {
      const irUrl = `https://m.stock.naver.com/api/stock/${stock.code}/irInfo?pageSize=3&page=1`
      const irRes = await fetch(irUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const irData = await irRes.json()
      const irItems = Array.isArray(irData) ? irData : (irData?.items || [])
      if (!irItems || irItems.length === 0) continue
      let title = ''
      let summary = ''
      let score = 50
      try {
        const summarized = await summarizeWithGemini(irItems, stock.name)
        title = summarized.title
        summary = summarized.summary
        score = summarized.score
      } catch (e) {
        const fallback = buildFallbackSummary(irItems, stock.name)
        title = fallback.title
        summary = fallback.summary
        score = fallback.score
        console.warn(`IR summary fallback for ${stock.code}:`, e)
      }
      const latestIrItem = irItems[0]
      const boardId = latestIrItem?.boardId || latestIrItem?.irInfoId || latestIrItem?.id
      const finalUrl = boardId
        ? `https://m.stock.naver.com/domestic/stock/${stock.code}/ir/${boardId}`
        : `https://m.stock.naver.com/domestic/stock/${stock.code}/ir`

      const { error: insertError } = await supabase.from('ir_info').upsert({
        stock_code: stock.code,
        title,
        url: finalUrl,
        published_at: new Date().toISOString(),
        content: JSON.stringify(irItems),
        source: '네이버 IR',
        llm_summary: summary
      }, { onConflict: 'stock_code, url' })

      // news 테이블에도 함께 저장 (메인 페이지 '최근 주요 이슈' 연동용)
      await supabase.from('news').upsert({
        stock_id: stock.id,
        title: title,
        llm_summary: summary,
        ai_score: score,
        url: finalUrl,
        type: 'ir',
        source: '네이버 IR (Gemini 요약)',
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
          message: `Successfully processed IR for ${processedCount} stocks`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntryId)
    }

    return new Response(JSON.stringify({ message: `Processed IR for ${processedCount} stocks` }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
  } catch (err: any) {
    console.error('IR collection error:', err.message)
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
      await supabase
        .from('batch_execution_logs')
        .insert({
          function_name: 'fetch-ir',
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
    }
    return new Response(JSON.stringify({ error: err.message }), { headers: { 'Content-Type': 'application/json' }, status: 500 })
  }
})
