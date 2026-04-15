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

    // 1. 처리 대상인 모든 pending 예측의 주식 ID 및 날짜 목록 가져오기
    const { data: pendingStocks, error: pendingError } = await supabase
      .from('predictions')
      .select('stock_id, game_date')
      .lte('game_date', currentDateStr)
      .eq('result', 'pending');

    if (pendingError) throw pendingError;
    
    // 유니크한 (stock_id, game_date) 쌍 추출
    const uniquePairs = Array.from(new Set(pendingStocks?.map(p => `${p.stock_id}_${p.game_date}`)));
    
    if (uniquePairs.length === 0) {
      // 대기 중인 예측이 없으면 daily_stocks만 마감 처리 시도
      const { data: openLeagues } = await supabase
        .from('daily_stocks')
        .select('id')
        .lte('game_date', currentDateStr)
        .in('status', ['pending', 'closing']);
      
      if (openLeagues && openLeagues.length > 0) {
        await supabase.from('daily_stocks').update({ status: 'closed' }).in('id', openLeagues.map(l => l.id));
      }

      return new Response(JSON.stringify({ message: `No pending predictions found for today (${currentDateStr}).` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. 해당 주식들의 정보, 리그 참여 여부, 날짜별 시세(정답 데이터) 가져오기
    const stockIds = Array.from(new Set(pendingStocks?.map(p => p.stock_id)));
    const targetDates = Array.from(new Set(pendingStocks?.map(p => p.game_date)));
    const { data: stocksInfo } = await supabase
      .from('stocks')
      .select('id, code, name, ai_win_count, ai_processed_count')
      .in('id', stockIds);

    const { data: dailyStocks } = await supabase
      .from('daily_stocks')
      .select('id, stock_id, game_date, ai_score, status')
      .lte('game_date', currentDateStr);

    const { data: priceRows, error: priceError } = await supabase
      .from('stock_price_history')
      .select('stock_id, price_date, change_rate')
      .in('stock_id', stockIds)
      .in('price_date', targetDates);
    if (priceError) throw priceError;

    let processedCount = 0;
    let skippedNoPriceCount = 0;
    const leagueMap = new Map(dailyStocks?.map(ds => [`${ds.stock_id}_${ds.game_date}`, ds]));
    const priceMap = new Map(priceRows?.map(row => [`${row.stock_id}_${row.price_date}`, row]));

    console.log(`Processing ${uniquePairs.length} unique stock-date pairs...`);

    for (const pair of uniquePairs) {
      const [stockIdStr, gameDate] = pair.split('_');
      const stockId = parseInt(stockIdStr);
      const stock = stocksInfo?.find(s => s.id === stockId);
      if (!stock) continue;

      const priceRow = priceMap.get(pair);
      if (!priceRow) {
        skippedNoPriceCount++;
        console.warn(`Skipping ${pair}: missing stock_price_history for game_date`);
        continue;
      }

      const changeRate = Number(priceRow.change_rate || 0);
      const change_amount = changeRate;
      let resultOutcome = 'draw';
      if (change_amount > 0) resultOutcome = 'up';
      else if (change_amount < 0) resultOutcome = 'down';

      // 해당 종목이 리그 종목인지 확인
      const dailyStock = leagueMap.get(pair);

      // 3. stocks 테이블 업데이트 (AI 관련 스태츠는 리그 종목일 때만 갱신하거나 혹은 전체 종목에 대해 갱신)
      // 여기서는 리그 종목일 때만 AI 통계를 갱신합니다.
      if (dailyStock && dailyStock.status !== 'closed') {
        const updateData: any = {
          ai_processed_count: (stock.ai_processed_count || 0) + 1
        };
        if (change_amount > 0) {
          updateData.ai_win_count = (stock.ai_win_count || 0) + 1;
        }
        await supabase.from('stocks').update(updateData).eq('id', stockId);
      }

      // 4. 해당 주식/날짜의 모든 pending 예측 처리
      const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('stock_id', stockId)
        .eq('game_date', gameDate)
        .eq('result', 'pending');

      if (predictions && predictions.length > 0) {
        for (const pred of predictions) {
          let userResult = 'draw';
          let pointsAwarded = 0;

          if (resultOutcome === 'draw') {
            userResult = 'draw';
          } else if (pred.prediction_type === resultOutcome) {
            userResult = 'win';
            // 리그 종목일 때만 포인트 지급
            if (dailyStock) pointsAwarded = POINTS_FOR_WIN;
          } else {
            userResult = 'lose';
          }

          // prediction 결과 업데이트
          await supabase.from('predictions').update({
            result: userResult,
            points_awarded: pointsAwarded
          }).eq('id', pred.id);

          // 포인트가 있으면 유저 프로필 업데이트
          if (pointsAwarded > 0) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('points')
              .eq('id', pred.user_id)
              .single();
            
            if (profileData) {
              await supabase.from('profiles').update({
                points: (profileData.points || 0) + pointsAwarded
              }).eq('id', pred.user_id);
            }
          }
        }
      }

      // 5. 리그 종목이었다면 daily_stocks 마감 처리 및 AI 결과 기록
      if (dailyStock) {
        let aiResult = 'lose';
        if (resultOutcome === 'up') {
          aiResult = 'win';
        } else if (resultOutcome === 'draw') {
          aiResult = 'draw';
        }

        await supabase.from('daily_stocks').update({
          status: 'closed',
          ai_result: aiResult
        }).eq('id', dailyStock.id);
      }

      processedCount++;
    }

    // 로그 종료 기록
    if (logEntry) {
      await supabase
        .from('batch_execution_logs')
        .update({
          status: 'success',
          processed_count: processedCount,
          message: `Successfully processed results for ${processedCount} stocks (skipped: ${skippedNoPriceCount})`,
          finished_at: new Date().toISOString()
        })
        .eq('id', logEntry.id)
    }

    return new Response(JSON.stringify({ 
      message: 'Successfully processed daily results', 
      processed_stocks: processedCount,
      skipped_stocks: skippedNoPriceCount
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
