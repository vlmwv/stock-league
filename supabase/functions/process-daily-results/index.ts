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
    const startTime = new Date().toISOString()
    
    // 로그 시작 기록
    const { data: logEntry } = await supabase
      .from('batch_execution_logs')
      .insert({
        function_name: 'process-daily-results',
        status: 'success',
        started_at: startTime
      })
      .select()
      .single()
    
    // 한국 시간 기준 현재 날짜(YYYY-MM-DD) 구하기
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const currentDateStr = kstDate.toISOString().split('T')[0];

    // 0. 리그 외 종목에 대한 비정상 예측(Stray Predictions) 처리
    //    리그에 선정되지 않은 종목에 예측을 한 경우, 'pending'으로 남지 않도록 'draw' 처리합니다.
    const { data: strayPredictions, error: strayError } = await supabase
      .from('predictions')
      .select('id')
      .lte('game_date', currentDateStr)
      .eq('result', 'pending');

    if (!strayError && strayPredictions && strayPredictions.length > 0) {
      console.log(`Processing ${strayPredictions.length} stray predictions...`);
      const strayIds = strayPredictions.map(p => p.id);
      await supabase
        .from('predictions')
        .update({ result: 'draw', points_awarded: 0 })
        .in('id', strayIds);
    }

    // 1. 오늘의 daily_stocks 조회 (상태가 pending이거나 closing인 경우만)
    // .lte('game_date', currentDateStr)를 통해 과거에 누락된 데이터도 함께 가져옴
    const { data: dailyStocks, error: fetchDailyError } = await supabase
      .from('daily_stocks')
      .select('*, stocks:stock_id (code, name, ai_win_count, ai_processed_count)')
      .lte('game_date', currentDateStr)
      .in('status', ['pending', 'closing'])

    if (fetchDailyError) throw fetchDailyError
    if (!dailyStocks || dailyStocks.length === 0) {
      return new Response(JSON.stringify({ message: `No pending daily stocks found for today (${currentDateStr})` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. 이미 update-krx-top-100 / update-naver-stocks를 통해 갱신된 
    //    stocks의 change_amount를 바로 사용하여 승패를 판정합니다. (Naver API 연동 제거)
    let processedCount = 0;

    for (const dailyStock of dailyStocks) {
      if (!dailyStock.stocks) continue;

      const code = dailyStock.stocks.code;
      const change_amount = dailyStock.stocks.change_amount || 0;
      const stock_id = dailyStock.stock_id;

      let resultOutcome = 'draw';
      if (change_amount > 0) resultOutcome = 'up';
      else if (change_amount < 0) resultOutcome = 'down';

      // 3. stocks 테이블 업데이트 (AI 예측 성공 여부 추가 기록 등)
      //    (현재가/변화량은 이미 이전 배치에서 업데이트 되었으므로 제외)
      const updateData: any = {
        ai_processed_count: (dailyStock.stocks.ai_processed_count || 0) + 1
      };

      if (change_amount > 0) {
        updateData.ai_win_count = (dailyStock.stocks.ai_win_count || 0) + 1;
      }

      const { error: updateError } = await supabase.from('stocks').update(updateData).eq('id', stock_id);
      if (updateError) {
        console.error(`Error updating stocks for ${code}:`, updateError.message);
      } else {
        console.log(`Successfully updated AI processed stats for ${code}`);
      }

      // 4. predictions(유저 예측 내역) 결과 처리
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('stock_id', stock_id)
        .lte('game_date', dailyStock.game_date as any)
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

    // 로그 종료 기록
    if (logEntry) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: processedCount,
          message: `Successfully processed results for ${processedCount} stocks`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
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
    try {
      await supabase
        .from('batch_execution_logs')
        .insert({
          function_name: 'process-daily-results',
          status: 'fail',
          message: err.message,
          error_detail: { stack: err.stack },
          finished_at: new Date().toISOString()
        })
    } catch (e) {
      console.error('Failed to log error to DB:', e)
    }
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
