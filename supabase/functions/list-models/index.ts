import { createClient } from '@supabase/supabase-js'
import { isAuthorizedBatchCall, unauthorizedResponse } from '../_shared/auth.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

Deno.serve(async (req) => {
  // 인가: cron/서버(service_role)만 호출할 수 있다. verify_jwt만으로는 anon 키 호출이 통과된다.
  if (!isAuthorizedBatchCall(req)) return unauthorizedResponse()

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
