async function testYahoo() {
  const symbols = ['^KS11', '^KQ11', '^GSPC', '^IXIC', '^DJI'];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };

  for (const symbol of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      console.log(`Fetching ${symbol}...`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error(`Failed to fetch ${symbol}: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.error(text.slice(0, 100));
        continue;
      }
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta) {
        console.log(`Success ${symbol}: price=${meta.regularMarketPrice}, prevClose=${meta.previousClose}`);
      } else {
        console.warn(`No meta found for ${symbol}`);
      }
    } catch (e) {
      console.error(`Error ${symbol}:`, e.message);
    }
  }
}

testYahoo();
