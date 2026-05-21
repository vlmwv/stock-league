import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const supabase = createClient(process.env.NUXT_PUBLIC_SUPABASE_URL, process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: stocks } = await supabase.from('stocks').select('id, code, sector').not('code', 'is', null);
  
  console.log(`Found ${stocks?.length || 0} stocks to backfill.`);
  if (!stocks) return;
  
  for (const stock of stocks) {
    const isKOSDAQ = stock.sector === 'KOSDAQ';
    const suffix = isKOSDAQ ? '.KQ' : '.KS';
    const symbol = `${stock.code}${suffix}`;
    
    let data = await fetchHistory(symbol);
    if (!data) {
      const otherSuffix = isKOSDAQ ? '.KS' : '.KQ';
      data = await fetchHistory(`${stock.code}${otherSuffix}`);
    }

    if (data && data.timestamp && data.indicators?.quote?.[0]?.close) {
        const upserts = [];
        const quote = data.indicators.quote[0];
        for (let i = 1; i < data.timestamp.length; i++) {
          const ts = data.timestamp[i];
          const date = new Date((ts + 32400) * 1000).toISOString().split('T')[0]; // Adjust +9h for KST broadly if needed, but Yahoo usually gives 00:00 KST
          const close = quote.close[i];
          const prevClose = quote.close[i-1];
          if (close === null || prevClose === null || close === undefined || prevClose === undefined) continue;
          
          const open = quote.open?.[i];
          const high = quote.high?.[i];
          const low = quote.low?.[i];

          const closeVal = Math.round(close);
          const openVal = open !== null && open !== undefined ? Math.round(open) : closeVal;
          const highVal = high !== null && high !== undefined ? Math.round(high) : closeVal;
          const lowVal = low !== null && low !== undefined ? Math.round(low) : closeVal;

          const change_amount = closeVal - Math.round(prevClose);
          const change_rate = parseFloat(((change_amount / Math.round(prevClose)) * 100).toFixed(2));
          
          upserts.push({
            stock_id: stock.id,
            price_date: date,
            open_price: openVal,
            high_price: highVal,
            low_price: lowVal,
            close_price: closeVal,
            change_amount,
            change_rate
          });
        }
       if (upserts.length > 0) {
         await supabase.from('stock_price_history').upsert(upserts, { onConflict: 'stock_id, price_date' });
         console.log(`Backfilled ${upserts.length} days for ${stock.code}`);
       }
    } else {
      console.log(`Failed to fetch or no data for ${stock.code}`);
    }
  }
  console.log('Backfill complete!');
}

async function fetchHistory(symbol: string) {
   const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
   try {
     const res = await fetch(url);
     const json = await res.json();
     return json?.chart?.result?.[0] || null;
   } catch {
     return null;
   }
}

run();
