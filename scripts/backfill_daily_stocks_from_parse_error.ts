import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY as string
const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY || '') as string

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars: NUXT_PUBLIC_SUPABASE_URL / NUXT_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function buildFallback(stockName: string): { summary: string; score: number } {
  return {
    summary: `${stockName}은 최근 수급과 가격 흐름 중심의 기술적 구간입니다.`,
    score: 65
  }
}

async function analyzeWithGemini(stockName: string, sector: string): Promise<{ summary: string; score: number }> {
  if (!geminiApiKey) return buildFallback(stockName)

  const prompt = `주식 전문 분석가로서 ${stockName} (${sector || '일반'}) 종목의 단기 방향성을 분석하세요.

아래 JSON 형식으로만 답하세요.
{
  "summary": "핵심 요약 (50자 이내)",
  "score": 0~100 사이 숫자
}

주의:
- 마크다운/코드블록 없이 JSON만 출력
- 중립 50점 남발 금지, 데이터 기반으로 변별력 있게 점수 산출`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          response_mime_type: 'application/json',
          response_schema: {
            type: 'OBJECT',
            properties: {
              summary: { type: 'STRING' },
              score: { type: 'NUMBER' }
            },
            required: ['summary', 'score']
          }
        }
      })
    })

    if (!response.ok) return buildFallback(stockName)

    const data: any = await response.json()
    let text = (data?.candidates?.[0]?.content?.parts || [])
      .map((part: any) => part?.text || '')
      .join('\n')
      .trim()

    if (!text) return buildFallback(stockName)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) text = jsonMatch[0]

    let parsed: any = {}
    try {
      parsed = JSON.parse(text)
    } catch {
      return buildFallback(stockName)
    }

    const scoreNum = Number(parsed.score)
    const score = Number.isFinite(scoreNum) ? clampScore(scoreNum) : 65
    const summary = (parsed.summary || '').trim() || `${stockName}은 최근 수급과 가격 흐름 중심의 기술적 구간입니다.`

    return { summary, score }
  } catch {
    return buildFallback(stockName)
  }
}

async function main() {
  const rawLimit = Number(process.argv[2] || 50)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 50

  const { data, error } = await supabase
    .from('daily_stocks')
    .select('id, game_date, stock_id, llm_summary, ai_score, stocks(name, sector)')
    .eq('llm_summary', '응답 파싱 오류')
    .order('game_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load targets:', error.message)
    process.exit(1)
  }

  const targets = data || []
  if (targets.length === 0) {
    console.log('No parse-error rows found.')
    return
  }

  console.log(`Targets: ${targets.length}`)

  let updated = 0
  for (const row of targets) {
    const stock = row.stocks as any
    const stockName = stock?.name || '종목'
    const sector = stock?.sector || '일반'

    const analyzed = await analyzeWithGemini(stockName, sector)

    const { error: updateError } = await supabase
      .from('daily_stocks')
      .update({
        llm_summary: analyzed.summary,
        ai_score: analyzed.score
      })
      .eq('id', row.id)

    if (updateError) {
      console.error(`Update failed id=${row.id}: ${updateError.message}`)
      continue
    }

    updated += 1
    console.log(`[${updated}/${targets.length}] ${row.game_date} ${stockName} -> ${analyzed.score}`)
  }

  console.log(`Done. updated=${updated}`)
}

main()

