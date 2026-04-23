import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const SEED_DATA = [
  {
    event_name: "미국 신규 실업수당 청구건수",
    event_at: "2026-04-23T12:30:00Z",
    country: "US",
    importance: 3,
    forecast: "212K",
    actual: "210K",
    previous: "215K",
    unit: "K",
    impact: "positive"
  },
  {
    event_name: "미국 1분기 GDP (속보치)",
    event_at: "2026-04-30T12:30:00Z",
    country: "US",
    importance: 3,
    forecast: "2.5%",
    actual: null,
    previous: "3.4%",
    unit: "%"
  },
  {
    event_name: "미국 근원 소비지출 물가지수 (PCE)",
    event_at: "2026-04-24T12:30:00Z",
    country: "US",
    importance: 3,
    forecast: "2.7%",
    actual: null,
    previous: "2.8%",
    unit: "%"
  },
  {
    event_name: "한국 4월 소비자물가지수 (CPI)",
    event_at: "2026-05-02T01:00:00Z",
    country: "KR",
    importance: 3,
    forecast: "3.0%",
    actual: null,
    previous: "3.1%",
    unit: "%"
  }
]

Deno.serve(async (req) => {
  try {
    const { mode } = await req.json().catch(() => ({ mode: 'fetch' }))

    if (mode === 'seed') {
      console.log('Seeding economic indicators...')
      const { error } = await supabase
        .from('economic_indicators')
        .upsert(SEED_DATA, { onConflict: 'event_name, event_at' })

      if (error) throw error
      return new Response(JSON.stringify({ message: "Seeding successful" }), { status: 200 })
    }

    if (mode === 'auto-update') {
      console.log('Running auto-update for economic indicators...')
      
      // 1. 발표 시간이 지났는데 실제치가 없는 지표 조회
      const now = new Date().toISOString()
      const { data: pending, error: fetchError } = await supabase
        .from('economic_indicators')
        .select('*')
        .lte('event_at', now)
        .is('actual', null)

      if (fetchError) throw fetchError

      if (!pending || pending.length === 0) {
        return new Response(JSON.stringify({ message: "No pending indicators to update" }), { status: 200 })
      }

      // 2. 각 지표에 대해 외부 데이터(또는 AI)를 통한 업데이트 시도
      // (현 버전에서는 간단한 업데이트 로직 예시만 포함)
      const updates = []
      for (const item of pending) {
        // 실제 운영 시에는 여기서 금융 API(예: FMP, InvestPy 등)를 호출합니다.
        // 여기서는 예시로 '미국 신규 실업수당 청구건수' 등에 대한 자동 매칭 로직을 시뮬레이션합니다.
        if (item.event_name.includes('실업수당')) {
          updates.push({
            ...item,
            actual: "210K", // 실제 데이터 소스에서 가져온 값 가정
            impact: "positive",
            updated_at: new Date().toISOString()
          })
        }
        // 다른 지표들도 동일한 방식으로 처리 가능
      }

      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('economic_indicators')
          .upsert(updates)
        if (updateError) throw updateError
      }

      return new Response(JSON.stringify({ 
        message: `Auto-update completed. Updated ${updates.length} items.`,
        updated_count: updates.length 
      }), { status: 200 })
    }

    // Default: Return the list of indicators from the DB
    const { data, error } = await supabase
      .from('economic_indicators')
      .select('*')
      .order('event_at', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
