import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    const { daily_stock_id } = await req.json()
    if (!daily_stock_id) {
      return new Response(JSON.stringify({ error: 'daily_stock_id is required' }), { status: 400 })
    }

    // 1. Fetch current recommendation data
    const { data: dailyStock, error: dsError } = await supabase
      .from('daily_stocks')
      .select('*, stocks(id, code, name, sector)')
      .eq('id', daily_stock_id)
      .single()

    if (dsError || !dailyStock) {
      return new Response(JSON.stringify({ error: 'Recommendation not found' }), { status: 404 })
    }

    const stock = dailyStock.stocks
    const initialScore = dailyStock.ai_score
    const initialSummary = dailyStock.llm_summary

    // 2. Fetch latest news since recommendation (or just latest news)
    const newsUrl = `https://m.stock.naver.com/api/news/stock/${stock.code}?pageSize=5`
    let newsItems = []
    try {
      const newsRes = await fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (newsRes.ok) newsItems = (await newsRes.json())?.items || []
    } catch (e) {
      console.warn('Failed to fetch news for re-evaluation')
    }

    const newsSummary = newsItems.length > 0
      ? newsItems.map((item: any) => `- ${item.tit}`).join('\n')
      : '최근 주요 뉴스 없음'

    // 3. Ask Gemini for Re-evaluation
    const prompt = `주식 분석 전문가로서, 이전에 추천했던 종목의 유효성을 재검증해 주세요.

[종목 정보]
- 종목명: ${stock.name}
- 업종: ${stock.sector || '일반'}
- 최초 추천 점수: ${initialScore}
- 최초 추천 사유: ${initialSummary}

[최근 업데이트된 뉴스]
${newsSummary}

분석 지침:
1. 위 뉴스를 바탕으로 최초 추천 근거가 여전히 유효한지 판단하세요.
2. 만약 새로운 악재(실적 부진, 규제, 수급 악화 등)가 발견되었다면 점수를 낮게 책정하세요.
3. 현재 시점에서 이 종목에 대한 상승 예측을 유지해야 할지, 아니면 '철회(해제)'해야 할지 결정하세요.
4. **점수(0-100)**: 70점 이상이면 유지(STAY), 50점 미만이면 철회(WITHDRAW)를 강력히 권고합니다.

반드시 아래 JSON 형식으로만 응답하세요.
{
  "new_score": 산출된 신규 점수,
  "judgment": "STAY" 또는 "WITHDRAW",
  "reason": "판단 근거 (150자 이내)"
}`

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 250,
          response_mime_type: "application/json"
        }
      })
    })

    if (!geminiRes.ok) {
      throw new Error(`Gemini API Error: ${await geminiRes.text()}`)
    }

    const geminiData = await geminiRes.json()
    const resultText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    const result = JSON.parse(resultText)

    return new Response(JSON.stringify({
      daily_id: daily_stock_id,
      stock_name: stock.name,
      initial_score: initialScore,
      new_score: result.new_score,
      judgment: result.judgment,
      reason: result.reason
    }), {
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
