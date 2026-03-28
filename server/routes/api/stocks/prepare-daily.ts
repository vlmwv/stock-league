import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  
  // 1. 보안 검증 (Service Role Key 체크)
  const authHeader = getHeader(event, 'Authorization')
  
  // runtimeConfig 사용 (Railway 변수는 NUXT_ 프리픽스 필수)
  const SERVICE_ROLE_KEY = config.supabaseServiceRoleKey
  const GEMINI_API_KEY = config.geminiApiKey

  if (!SERVICE_ROLE_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SUPABASE_SERVICE_ROLE_KEY environment variable is missing on Railway',
    })
  }

  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid Service Role Key provided',
    })
  }

  if (!GEMINI_API_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_GEMINI_API_KEY environment variable is missing on Railway',
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  try {
    console.log('[PrepareDaily] Selecting daily stocks triggered...')
    
    // 1. 시가총액 상위 100개 종목 가져오기
    const { data: topStocks, error: topError } = await (supabase as any)
      .from('stocks')
      .select('id, code, name, sector')
      .lte('market_cap_rank', 100)
    
    if (topError) throw topError
    if (!topStocks || (topStocks as any).length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No stocks found in database',
      })
    }

    // 배열 섞기 (Fisher-Yates shuffle)
    const shuffledStocks = [...(topStocks as any[])]
    for (let i = shuffledStocks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStocks[i], shuffledStocks[j]] = [shuffledStocks[j], shuffledStocks[i]];
    }

    const selectedStocks = shuffledStocks.slice(0, 5)
    console.log(`[PrepareDaily] Selected 5 stocks: ${selectedStocks.map((s: any) => s.name).join(', ')}`)

    // 타겟 날짜 계산 (다음 영업일)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    
    const targetDate = new Date(kstNow)
    const currentDay = kstNow.getDay() // 0(일) ~ 6(토)
    
    let daysToAdd = 1
    if (currentDay === 5) { // 금요일 -> 월요일 (+3)
      daysToAdd = 3
    } else if (currentDay === 6) { // 토요일 -> 월요일 (+2)
      daysToAdd = 2
    }
    targetDate.setDate(kstNow.getDate() + daysToAdd)
    const targetDateStr = targetDate.toISOString().split('T')[0]
    
    console.log(`[PrepareDaily] Target game_date: ${targetDateStr}`)
    
    let processedCount = 0
    let errors = []
    
    // 2. 각 종목별 뉴스 수집 및 Gemini 요약 생성
    for (const stock of selectedStocks) {
      try {
        const s = stock as any
        console.log(`[PrepareDaily] Processing ${s.name}...`)
        
        // 뉴스/공시 수집 (Naver API)
        const newsUrl = `https://m.stock.naver.com/api/news/stock/${s.code}?pageSize=3`
        const disclosureUrl = `https://m.stock.naver.com/api/stock/${s.code}/disclosure?pageSize=3&page=1`
        
        let newsItems = []
        let disclosureItems = []

        try {
          const [newsRes, discRes] = await Promise.all([
            $fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }).catch(() => null),
            $fetch(disclosureUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }).catch(() => null)
          ])
          
          newsItems = (newsRes as any)?.items || []
          disclosureItems = Array.isArray(discRes) ? discRes : ((discRes as any)?.items || [])
        } catch (fetchErr) {
          console.warn(`[PrepareDaily] External fetch failed for ${s.name}`)
        }

        // Gemini 요약 생성 (2026 스테이블 모델: gemini-2.5-flash)
        const prompt = `당신은 주식 예측 게임의 전문가입니다. 사용자들이 내일 주가 향방(상승/하락)을 예측할 수 있도록, 다음의 최근 뉴스 및 공시 정보를 바탕으로 '${s.name}'(${s.sector || '기타'} 섹터) 종목을 내일의 예측 게임 종목으로 추천하는 이유 혹은 관전 포인트를 2~3문장 이내로 핵심만 아주 짧고 흥미롭게 작성해주세요.\n\n[최근 이슈]\n${newsItems.slice(0, 2).map((n:any) => "- " + n.tit).join('\n')}\n${disclosureItems.slice(0, 2).map((d:any) => "- " + d.title).join('\n')}`

        const geminiRes = await $fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          body: {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
          }
        }) as any

        const summary = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '추천 사유를 생성하지 못했습니다.'

        // DB 삽입 (중복 방지)
        const { data: existing } = await (supabase as any)
          .from('daily_stocks')
          .select('id')
          .eq('game_date', targetDateStr)
          .eq('stock_id', s.id)
          .maybeSingle()
          
        if (!existing) {
          const { error: insertError } = await (supabase as any)
            .from('daily_stocks')
            .insert({
              stock_id: s.id,
              game_date: targetDateStr,
              llm_summary: summary,
              status: 'pending'
            })
            
          if (insertError) throw insertError
          processedCount++
        }
      } catch (err: any) {
        console.error(`[PrepareDaily] Error for ${(stock as any).name}:`, err.message)
        errors.push({ stock: (stock as any).name, error: err.message })
      }
    }

    return {
      success: true,
      message: `Successfully prepared ${processedCount} stocks for ${targetDateStr}`,
      game_date: targetDateStr,
      errors: errors.length > 0 ? errors : undefined
    }
    
  } catch (err: any) {
    console.error('[PrepareDaily] Fatal Error:', err.message)
    throw createError({
      statusCode: 500,
      statusMessage: err.message,
    })
  }
})
