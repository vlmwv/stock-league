import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 예측 성공 시 지급 포인트
const POINTS_FOR_WIN = 10;
const POINTS_FOR_DRAW = 0;
const POINTS_FOR_LOSE = 0;

// AI 추천 적중(ai_result) 지평: 추천일로부터 30일(달력) 후 첫 거래일 종가로 판정
const AI_HORIZON_DAYS = 30;

// AI 추천 적중(ai_result)을 "추천 후 30일 수익률" 기준으로 전체 재산정한다.
//   적중 기준가(rec_price = 추천 전일 종가) 대비 game_date+30일 이후 첫 거래일 종가가
//   높으면 win / 낮으면 lose / 같으면 draw, 30일 미경과면 pending, 기준가 없으면 null.
// stocks.ai_win_count / ai_processed_count 도 daily_stocks 기준으로 재동기화한다.
// ※ 이 로직은 scripts/recalculate_ai_results.ts 와 동일하다. 한쪽을 고치면 다른 쪽도 함께 확인할 것.
async function recomputeAiResults() {
  const kstToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const addDays = (d: string, n: number) => {
    const dt = new Date(d + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  const fetchAll = async (table: string, cols: string, order: string, gte?: [string, string]) => {
    let all: any[] = []; let from = 0; const page = 1000;
    while (true) {
      let q = supabase.from(table).select(cols).order(order, { ascending: true }).range(from, from + page - 1);
      if (gte) q = q.gte(gte[0], gte[1]);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < page) break;
      from += page;
    }
    return all;
  };

  const ds = await fetchAll('daily_stocks', 'id, stock_id, game_date, ai_result', 'game_date');
  if (ds.length === 0) return;
  const minDate = ds[0].game_date;
  const prices = await fetchAll('stock_price_history', 'stock_id, price_date, close_price', 'price_date', ['price_date', addDays(minDate, -12)]);

  const byStock = new Map<number, { date: string, close: number }[]>();
  for (const p of prices) {
    if (p.close_price == null) continue;
    if (!byStock.has(p.stock_id)) byStock.set(p.stock_id, []);
    byStock.get(p.stock_id)!.push({ date: p.price_date, close: Number(p.close_price) });
  }
  for (const arr of byStock.values()) arr.sort((a, b) => (a.date < b.date ? -1 : 1));

  const recPrice = (sid: number, gd: string): number | null => {
    const arr = byStock.get(sid) || [];
    let prev: number | null = null; let same: number | null = null;
    for (const r of arr) { if (r.date < gd) prev = r.close; if (r.date === gd) same = r.close; }
    return prev ?? same ?? null;
  };
  const horizonClose = (sid: number, gd: string): { date: string, close: number } | null => {
    const tgt = addDays(gd, AI_HORIZON_DAYS);
    const arr = byStock.get(sid) || [];
    for (const r of arr) if (r.date >= tgt) return r;
    return null;
  };

  const groups = new Map<string, number[]>();
  const perStock = new Map<number, { win: number, proc: number }>();
  for (const d of ds) {
    const rp = recPrice(d.stock_id, d.game_date);
    let result: string | null;
    if (rp == null || rp <= 0) {
      result = null;
    } else {
      const hc = horizonClose(d.stock_id, d.game_date);
      if (!hc || hc.date > kstToday) result = 'pending';
      else if (hc.close > rp) result = 'win';
      else if (hc.close < rp) result = 'lose';
      else result = 'draw';
    }
    if (result !== (d.ai_result ?? null)) {
      const key = String(result);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d.id);
    }
    const ps = perStock.get(d.stock_id) || { win: 0, proc: 0 };
    if (result === 'win') { ps.win++; ps.proc++; }
    else if (result === 'lose' || result === 'draw') { ps.proc++; }
    perStock.set(d.stock_id, ps);
  }

  for (const [key, ids] of groups) {
    const value = key === 'null' ? null : key;
    for (let i = 0; i < ids.length; i += 500) {
      await supabase.from('daily_stocks').update({ ai_result: value }).in('id', ids.slice(i, i + 500));
    }
  }

  const stocksRows = await fetchAll('stocks', 'id, ai_win_count, ai_processed_count', 'id');
  for (const s of stocksRows) {
    const ps = perStock.get(s.id) || { win: 0, proc: 0 };
    if ((s.ai_win_count || 0) === ps.win && (s.ai_processed_count || 0) === ps.proc) continue;
    await supabase.from('stocks').update({ ai_win_count: ps.win, ai_processed_count: ps.proc }).eq('id', s.id);
  }
}

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
      .or('status.eq.pending,status.eq.closing');

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
      .select('id, code, name')
      .in('id', stockIds);

    const { data: dailyStocks } = await supabase
      .from('daily_stocks')
      .select('id, stock_id, game_date, status')
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

      // 3. daily_stocks 리그 마감 처리 (status만 닫는다)
      //    AI 추천 적중(ai_result)은 status와 분리되어, 아래 recomputeAiResults에서
      //    "추천 후 30일 수익률" 기준으로 별도 산정한다. stocks 집계도 거기서 재동기화한다.
      if (dailyStock && dailyStock.status !== 'closed') {
        await supabase.from('daily_stocks').update({ status: 'closed' }).eq('id', dailyStock.id);
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

    // AI 추천 적중(ai_result) 재집계 — "추천 후 30일 수익률" 기준 (status와 무관하게 전체 재산정)
    await recomputeAiResults();

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
