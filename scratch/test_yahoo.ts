import fetch from 'node-fetch';

async function test() {
  const symbol = '005930.KS';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
  try {
    const res = await fetch(url);
    const json: any = await res.json();
    const result = json?.chart?.result?.[0];
    if (result) {
      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      console.log('Timestamps length:', timestamps?.length);
      console.log('Has open:', !!quote?.open, 'Length:', quote?.open?.length);
      console.log('Has high:', !!quote?.high, 'Length:', quote?.high?.length);
      console.log('Has low:', !!quote?.low, 'Length:', quote?.low?.length);
      console.log('Has close:', !!quote?.close, 'Length:', quote?.close?.length);
      
      // Print first 5 data points
      for (let i = 0; i < Math.min(5, timestamps.length); i++) {
        console.log(`Index ${i}:`);
        console.log(`  Date: ${new Date(timestamps[i] * 1000).toISOString().split('T')[0]}`);
        console.log(`  Open: ${quote.open?.[i]}`);
        console.log(`  High: ${quote.high?.[i]}`);
        console.log(`  Low: ${quote.low?.[i]}`);
        console.log(`  Close: ${quote.close?.[i]}`);
      }
    } else {
      console.log('No result returned');
    }
  } catch (err: any) {
    console.error('Error fetching:', err.message);
  }
}

test();
