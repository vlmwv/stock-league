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

    // 1. 처리 대상 목록 생성 (predictions 또는 daily_stocks 기반)
    const { data: pendingPredictions } = await supabase
      .from('predictions')
      .select('stock_id, game_date')
      .lte('game_date', currentDateStr)
      .eq('result', 'pending');

    const { data: pendingDailyStocks } = await supabase
      .from('daily_stocks')
      .select('stock_id, game_date')
      .lte('game_date', currentDateStr)
      .or('status.eq.pending,status.eq.closing,ai_result.is.null');

    // 유니크한 (stock_id, game_date) 쌍 추출
    const pairsSet = new Set<string>();
    pendingPredictions?.forEach(p => pairsSet.add(`${p.stock_id}_${p.game_date}`));
    pendingDailyStocks?.forEach(ds => pairsSet.add(`${ds.stock_id}_${ds.game_date}`));
    
    const uniquePairs = Array.from(pairsSet);
    
    if (uniquePairs.length === 0) {
      console.log('No pending items to process.');
      return new Response(JSON.stringify({ message: `No pending items found for today (${currentDateStr}).` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. 관련 데이터 일괄 조회
    const stockIds = Array.from(new Set(uniquePairs.map(p => parseInt(p.split('_')[0]))));
    const targetDates = Array.from(new Set(uniquePairs.map(p => p.split('_')[1])));

    const { data: stocksInfo } = await supabase
      .from('stocks')
      .select('id, code, name, ai_win_count, ai_processed_count')
      .in('id', stockIds);

    const { data: dailyStocks } = await supabase
      .from('daily_stocks')
      .select('id, stock_id, game_date, ai_score, status, ai_result')
      .in('stock_id', stockIds)
      .in('game_date', targetDates);

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
      let resultOutcome: 'up' | 'down' | 'draw' = 'draw';
      if (changeRate > 0) resultOutcome = 'up';
      else if (changeRate < 0) resultOutcome = 'down';

      const dailyStock = leagueMap.get(pair);

      // 3. daily_stocks 업데이트 (결과가 없거나 닫히지 않은 경우)
      if (dailyStock && (dailyStock.status !== 'closed' || !dailyStock.ai_result)) {
        let aiResult = 'lose';
        if (resultOutcome === 'up') aiResult = 'win';
        else if (resultOutcome === 'draw') aiResult = 'draw';

        await supabase.from('daily_stocks').update({
          status: 'closed',
          ai_result: aiResult
        }).eq('id', dailyStock.id);

        // 4. stocks 테이블 통계 업데이트 (중복 가산 방지를 위해 기존에 pending이었을 때만 수행하는 것이 좋으나, 
        // 현재 로직상 한번만 처리되도록 status/ai_result 조건을 체크함)
        if (!dailyStock.ai_result) {
          const updateData: any = {
            ai_processed_count: (stock.ai_processed_count || 0) + 1
          };
          if (aiResult === 'win') {
            updateData.ai_win_count = (stock.ai_win_count || 0) + 1;
          }
          await supabase.from('stocks').update(updateData).eq('id', stockId);
        }
      }

      // 5. 해당 주식/날짜의 모든 pending 예측 처리
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
            if (dailyStock) pointsAwarded = POINTS_FOR_WIN;
          } else {
            userResult = 'lose';
          }

          await supabase.from('predictions').update({
            result: userResult,
            points_awarded: pointsAwarded
          }).eq('id', pred.id);

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
