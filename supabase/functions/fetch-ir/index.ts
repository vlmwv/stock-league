import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function buildFallbackSummary(items: any[], stockName: string): { title: string, summary: string } {
  const first = items[0] || {}
  const rawTitle = String(first.title || first.tit || '').trim()
  const baseTitle = rawTitle || `${stockName} IR 업데이트`
  const title = `${baseTitle.substring(0, 22)}${baseTitle.length > 22 ? '...' : ''} (요약)`
  return {
    title,
    summary: rawTitle ? `${rawTitle} 관련 IR 내용이 확인되었습니다.` : `${stockName} IR 업데이트가 있습니다.`
  }
}

async function summarizeWithGemini(items: any[], stockName: string): Promise<{ title: string, summary: string }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')
  const primaryItem = items[0]
  const primaryTitle = primaryItem.title || primaryItem.tit || ''
  const prompt = `당신은 전문 경제 기자입니다. 다음은 '${stockName}' 주식의 최신 IR(Investor Relations) 목록입니다.\n가장 중요한 핵심 내용 1가지를 골라 1~2문장으로 아주 짧고 강렬하게 요약해 주세요.\n또한 이 내용을 잘 나타내는 실제 뉴스 헤드라인 같은 제목을 1개 생성해 주세요. 이때 제목 끝에 '(요약)'을 붙여주세요.\n\n[제약 조건]\n- "${stockName} IR" 같은 단순 제목은 사용하지 마세요.\n- 구체적인 수치나 핵심 키워드를 포함한 임팩트 있는 제목을 만드세요.\n- 제목은 25자 이내로 작성해 주세요.\n\n응답 형식:\n제목: {실제 헤드라인} (요약)\n요약: {핵심 요약 내용}\n\n[목록]\n${items.map((item, i) => `${i + 1}. ${item.title || item.tit}`).join('\n')}`

  const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash-latest']
  let response: Response | null = null
  let lastErrorBody = ''
  for (const model of candidateModels) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 250 }
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
  let finalTitle = ''
  let finalSummary = ''
  if (text.includes('제목:')) {
    finalTitle = text.split('제목:')[1].split('\n')[0].trim()
    if (text.includes('요약:')) {
      finalSummary = text.split('요약:')[1].trim()
    }
  } else {
    finalSummary = text
  }
  if (!finalTitle || finalTitle.includes('IR')) {
    finalTitle = `${primaryTitle.substring(0, 20)}${primaryTitle.length > 20 ? '...' : ''} (요약)`
  }
  return { title: finalTitle, summary: finalSummary || '요약을 생성할 수 없습니다.' }
}

Deno.serve(async (req) => {
  try {
    console.log('Periodic IR collection started...')
    // 1. 전체 종목 조회 (상위 100 혹은 전체) 여기서는 전체 조회
    const { data: stocks, error: stockError } = await supabase.from('stocks').select('id, code, name')
    if (stockError) throw stockError
    if (!stocks || stocks.length === 0) throw new Error('No stocks found')
    let processedCount = 0
    // 무작위 3개 종목 선택 (시간당 전체를 다 돌리는 것이 부담될 수 있어) 필요 시 전체로 변경 가능
    const targetStocks = stocks.sort(() => 0.5 - Math.random()).slice(0, 3)
    for (const stock of targetStocks) {
      const irUrl = `https://m.stock.naver.com/api/stock/${stock.code}/irInfo?pageSize=3&page=1`
      const irRes = await fetch(irUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const irData = await irRes.json()
      const irItems = Array.isArray(irData) ? irData : (irData?.items || [])
      if (!irItems || irItems.length === 0) continue
      let title = ''
      let summary = ''
      try {
        const summarized = await summarizeWithGemini(irItems, stock.name)
        title = summarized.title
        summary = summarized.summary
      } catch (e) {
        const fallback = buildFallbackSummary(irItems, stock.name)
        title = fallback.title
        summary = fallback.summary
        console.warn(`IR summary fallback for ${stock.code}:`, e)
      }
      const { error: insertError } = await supabase.from('ir_info').upsert({
        stock_code: stock.code,
        title,
        url: `https://m.stock.naver.com/domestic/stock/${stock.code}/ir`,
        published_at: new Date().toISOString(),
        content: JSON.stringify(irItems),
        source: '네이버 IR',
        llm_summary: summary
      }, { onConflict: 'stock_code, url' })
      if (!insertError) processedCount++
    }
    return new Response(JSON.stringify({ message: `Processed IR for ${processedCount} stocks` }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { 'Content-Type': 'application/json' }, status: 500 })
  }
})
