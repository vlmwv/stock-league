import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const SEED_DATA = [
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
    event_name: "미국 1분기 GDP (속보치)",
    event_at: "2026-04-23T12:30:00Z",
    country: "US",
    importance: 3,
    forecast: "2.5%",
    actual: null,
    previous: "3.4%",
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
  },
  {
    event_name: "미국 연방기금금리 (FOMC)",
    event_at: "2026-05-03T18:00:00Z",
    country: "US",
    importance: 3,
    forecast: "5.50%",
    actual: null,
    previous: "5.50%",
    unit: "%"
  },
  {
    event_name: "미국 비농업 고용지수",
    event_at: "2026-05-08T12:30:00Z",
    country: "US",
    importance: 3,
    forecast: "200K",
    actual: null,
    previous: "303K",
    unit: "K"
  },
  {
    event_name: "미국 소매판매 (MoM)",
    event_at: "2026-04-15T12:30:00Z",
    country: "US",
    importance: 2,
    forecast: "0.4%",
    actual: "0.7%",
    previous: "0.9%",
    unit: "%",
    impact: "positive"
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

    // In a real scenario, we would fetch from a financial API here.
    // For this prototype, we'll just return the current data in the DB.
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
