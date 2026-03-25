import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 예측 성공 시 지급 포인트
const POINTS_FOR_WIN = 10;
const POINTS_FOR_DRAW = 0;
const POINTS_FOR_LOSE = 0;

Deno.serve(async (req) => {
  try {
    console.log('Fetching today\'s daily stocks...')
    
    // 한국 시간 기준 현재 날짜(YYYY-MM-DD) 구하기
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const currentDateStr = kstDate.toISOString().split('T')[0];

    // 1. 오늘의 daily_stocks 조회 (상태가 pending이거나 closing인 경우만)
    const { data: dailyStocks, error: fetchDailyError } = await supabase
      .from('daily_stocks')
      .select('*, stocks:stock_id (code, name)')
      .eq('game_date', currentDateStr)
      .in('status', ['pending', 'closing'])

    if (fetchDailyError) throw fetchDailyError
    if (!dailyStocks || dailyStocks.length === 0) {
      return new Response(JSON.stringify({ message: `No pending daily stocks found for today (${currentDateStr})` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Found ${dailyStocks.length} daily stocks for today. Fetching real-time prices from Naver...`)

    // 2. 네이버 API를 통해 현재 시가 가져오기
    const codes = dailyStocks.map((ds: any) => ds.stocks.code).join(',')
    const naverApiUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${codes}`
    
    const response = await fetch(naverApiUrl)
    if (!response.ok) {
      throw new Error(`Naver API responded with status: ${response.status}`)
    }

    const responseData = await response.json()
    
    if (!responseData.datas || responseData.datas.length === 0) {
      throw new Error('No data returned from Naver API')
    }

    let processedCount = 0;

    for (const data of responseData.datas) {
      const code = data.itemCode;
      const last_price = parseInt(data.closePriceRaw, 10);
      const change_amount = parseInt(data.compareToPreviousClosePriceRaw, 10);
      const change_rate = parseFloat(data.fluctuationsRatioRaw);
      const updated_at = new Date().toISOString();

      const dailyStock = dailyStocks.find((ds: any) => ds.stocks.code === code);
      if (!dailyStock) continue;

      const stock_id = dailyStock.stock_id;

      let resultOutcome = 'draw';
      if (change_amount > 0) resultOutcome = 'up';
      else if (change_amount < 0) resultOutcome = 'down';

      // 3. stocks 테이블 업데이트 및 stock_price_history 삽입
      const { error: updateError } = await supabase.from('stocks').update({
        last_price,
        change_amount,
        change_rate,
        updated_at
      }).eq('id', stock_id);

      if (updateError) {
        console.error(`Error updating stocks for ${code}:`, updateError.message);
      } else {
        console.log(`Successfully updated stock price for ${code}`);
      }

      // (선택) stock_price_history에 기록 (upsert 방식으로 당일 데이터 중복 방지)
      const { error: historyError } = await supabase.from('stock_price_history').upsert({
        stock_id,
        price_date: currentDateStr,
        close_price: last_price,
        change_amount,
        change_rate
      }, { onConflict: 'stock_id, price_date' });

      if (historyError) {
        console.error(`Error upserting stock_price_history for ${code}:`, historyError.message);
      } else {
        console.log(`Successfully saved stock_price_history for ${code}`);
      }

      // 4. predictions(유저 예측 내역) 결과 처리
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('stock_id', stock_id)
        .eq('game_date', currentDateStr)
        .eq('result', 'pending');

      if (!predError && predictions && predictions.length > 0) {
        for (const pred of predictions) {
          let userResult = 'draw';
          let pointsAwarded = POINTS_FOR_DRAW;

          if (resultOutcome === 'draw') {
            userResult = 'draw';
            pointsAwarded = POINTS_FOR_DRAW;
          } else if (pred.prediction_type === resultOutcome) {
            userResult = 'win';
            pointsAwarded = POINTS_FOR_WIN;
          } else {
            userResult = 'lose';
            pointsAwarded = POINTS_FOR_LOSE;
          }

          // prediction 결과 업데이트
          await supabase.from('predictions').update({
            result: userResult,
            points_awarded: pointsAwarded
          }).eq('id', pred.id);

          // 유저 프로필 포인트 업데이트 (승리해서 포인트가 0보다 클 때만)
          if (pointsAwarded > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('points')
              .eq('id', pred.user_id)
              .single();
            
            if (profileData) {
              await supabase.from('profiles').update({
                points: profileData.points + pointsAwarded
              }).eq('id', pred.user_id);
            }
          }
        }
      }

      // 5. daily_stocks 마감 처리
      await supabase.from('daily_stocks').update({
        status: 'closed'
      }).eq('id', dailyStock.id);

      processedCount++;
    }

    return new Response(JSON.stringify({ 
      message: 'Successfully processed daily results', 
      processed_stocks: processedCount
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('Error processing daily results:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
