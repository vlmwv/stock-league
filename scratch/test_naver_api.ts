import fetch from 'node-fetch'

async function test() {
  const category = 'KOSPI'
  const url = `https://m.stock.naver.com/api/stocks/marketValue/${category}?page=1&pageSize=100`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${category} top 100`)
  }
  const data = (await res.json()) as any
  const stocks = data.stocks || []
  
  console.log('Top 10 Stocks from Naver API:')
  stocks.slice(0, 10).forEach((s: any, idx: number) => {
    console.log(`${idx + 1}. ${s.stockName} (${s.itemCode}): marketValue=${s.marketValue}, closePrice=${s.closePrice}`)
  })
}

test().catch(console.error)
