import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    console.log('Fetching all stock codes from DB...')
    
    // 1. stocks 테이블에서 모든 종목 코드 조회
    const { data: stocks, error: fetchError } = await supabase
      .from('stocks')
      .select('code, name')

    if (fetchError) throw fetchError
    if (!stocks || stocks.length === 0) {
      return new Response(JSON.stringify({ message: 'No stocks found in DB' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${stocks.length} stocks. Fetching real-time prices from Naver...`)

    // 네이버 API는 한번에 너무 많은 요청을 보내면 실패할 수 있으므로, 50개씩 나눠서 요청
    const chunkSize = 50
    let totalUpdated = 0

    for (let i = 0; i < stocks.length; i += chunkSize) {
      const chunk = stocks.slice(i, i + chunkSize)
      const codes = chunk.map(s => s.code).join(',')
      
      const naverApiUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${codes}`
      
      const response = await fetch(naverApiUrl)
      if (!response.ok) {
        console.error(`Naver API responded with status: ${response.status}`)
        continue // 다음 청크로 진행
      }

      const responseData = await response.json()
      
      if (!responseData.datas || responseData.datas.length === 0) {
        console.warn('No data returned from Naver API for chunk', i)
        continue
      }

      const upsertData = responseData.datas.map((data: any) => {
        return {
          code: data.itemCode,
          last_price: parseInt(data.closePriceRaw, 10),
          change_amount: parseInt(data.compareToPreviousClosePriceRaw, 10),
          change_rate: parseFloat(data.fluctuationsRatioRaw),
          updated_at: new Date().toISOString()
        }
      })

      // onConflict가 아닌 update를 사용해서 코드 단건별로 업데이트를 할 수도 있지만, 
      // upsert를 사용하면 대량 업데이트에 효율적입니다.
      // 제약조건: code가 UNIQUE해야 합니다. stocks 테이블에는 변경되지 않은 나머지 필드(name, sector 등) 보존을 위해
      // 여기서는 각 항목별로 update를 치거나 혹은 name 등을 같이 upsert해야 할 수 있습니다.

      // stocks 테이블 스키마에 따르면:
      // code가 UNIQUE 이므로 onConflict: 'code' 로 upsert가 가능합니다.
      // 단, upsert 시 누락된 필수 필드가 있으면 안 될 수 있으므로 name을 다시 넣어주거나 기존 데이터를 병합해야 하는데 
      // Supabase에서는 기본적으로 생략된 필드는 default 값을 넣거나 기존 값을 유지하지 않을 수 있습니다.(upsert 동작)
      // 확인해본결과 Supabase JavaScript 클라이언트에서 ignoreDuplicates를 안쓰고 update만 치려면
      // 각 행에 대해 .update()를 호출하거나, 매치되는 필드만 담아서 upsert하는 것은 위험할 수 있습니다.
      // 따라서 DB에서 가져온 name과 원본 데이터를 그대로 융합합니다.

      const mergedUpsertData = upsertData.map((fresh: any) => {
        const original = chunk.find((s: any) => s.code === fresh.code)
        // 원본 정보를 보존하기 위해 name 등도 함께 전달 
        // (sector, summary 등은 생략해도 기존 값이 유지되는지 여부는 Postgres 설정에 따르며, 
        // 안전하게는 개별 update를 치는 것을 추천합니다만, 성능상 Promise.all 방식의 개별 Update를 사용하겠습니다.)
        return { ...fresh }
      })

      const updatePromises = mergedUpsertData.map((item: any) => 
        supabase
          .from('stocks')
          .update({
            last_price: item.last_price,
            change_amount: item.change_amount,
            change_rate: item.change_rate,
            updated_at: item.updated_at
          })
          .eq('code', item.code)
      )

      await Promise.all(updatePromises)
      
      totalUpdated += mergedUpsertData.length
      console.log(`Updated ${mergedUpsertData.length} stocks in chunk ${i / chunkSize + 1}`)
    }

    return new Response(JSON.stringify({ message: 'Successfully updated real-time prices from Naver', count: totalUpdated }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('Error updating real-time prices:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
