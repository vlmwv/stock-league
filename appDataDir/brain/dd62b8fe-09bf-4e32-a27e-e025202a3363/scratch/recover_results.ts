
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const POINTS_FOR_WIN = 10;

async function processResults() {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const currentDateStr = kstDate.toISOString().split('T')[0];

    console.log(`Target Date (KST): ${currentDateStr}`);

    // 1. 처리 대상 목록 생성 (ai_result가 null인 과거 모든 daily_stocks)
    const { data: pendingDailyStocks } = await supabase
      .from('daily_stocks')
      .select('stock_id, game_date, id, ai_result, status')
      .lte('game_date', currentDateStr)
      .or('status.eq.pending,status.eq.closing,ai_result.is.null');

    if (!pendingDailyStocks || pendingDailyStocks.length === 0) {
        console.log('No pending daily stocks found.');
        return;
    }

    console.log(`Found ${pendingDailyStocks.length} pending daily stocks.`);

    const stockIds = Array.from(new Set(pendingDailyStocks.map(p => p.stock_id)));
    const targetDates = Array.from(new Set(pendingDailyStocks.map(p => p.game_date)));

    const { data: stocksInfo } = await supabase
      .from('stocks')
      .select('id, ai_win_count, ai_processed_count')
      .in('id', stockIds);

    const { data: priceRows } = await supabase
      .from('stock_price_history')
      .select('stock_id, price_date, change_rate')
      .in('stock_id', stockIds)
      .in('price_date', targetDates);

    const priceMap = new Map(priceRows?.map(row => [`${row.stock_id}_${row.price_date}`, row]));

    for (const ds of pendingDailyStocks) {
        const pair = `${ds.stock_id}_${ds.game_date}`;
        const priceRow = priceMap.get(pair);
        
        if (!priceRow) {
            console.warn(`Skipping ${pair}: missing price history`);
            continue;
        }

        const changeRate = Number(priceRow.change_rate || 0);
        let resultOutcome = 'draw';
        if (changeRate > 0) resultOutcome = 'up';
        else if (changeRate < 0) resultOutcome = 'down';

        let aiResult = 'lose';
        if (resultOutcome === 'up') aiResult = 'win';
        else if (resultOutcome === 'draw') aiResult = 'draw';

        console.log(`Processing ${pair}: Change Rate ${changeRate} -> AI Result ${aiResult}`);

        // daily_stocks 업데이트
        await supabase.from('daily_stocks').update({
            status: 'closed',
            ai_result: aiResult
        }).eq('id', ds.id);

        // stocks 통계 업데이트 (중복 방지 체크)
        if (!ds.ai_result) {
            const stock = stocksInfo?.find(s => s.id === ds.stock_id);
            if (stock) {
                const updateData: any = {
                    ai_processed_count: (stock.ai_processed_count || 0) + 1
                };
                if (aiResult === 'win') {
                    updateData.ai_win_count = (stock.ai_win_count || 0) + 1;
                }
                await supabase.from('stocks').update(updateData).eq('id', ds.stock_id);
            }
        }

        // predictions 처리
        const { data: predictions } = await supabase
            .from('predictions')
            .select('*')
            .eq('stock_id', ds.stock_id)
            .eq('game_date', ds.game_date)
            .eq('result', 'pending');

        if (predictions && predictions.length > 0) {
            for (const pred of predictions) {
                let userResult = 'draw';
                let pointsAwarded = 0;
                if (resultOutcome === 'draw') userResult = 'draw';
                else if (pred.prediction_type === resultOutcome) {
                    userResult = 'win';
                    pointsAwarded = POINTS_FOR_WIN;
                } else userResult = 'lose';

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
    }
    console.log('Processing complete.');
}

processResults()
