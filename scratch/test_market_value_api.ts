async function run() {
  const url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=5'
  console.log(`Fetching from Naver Market Value API: ${url}`)
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Status: ${response.status}`)
      return
    }
    const data = await response.json()
    console.log('Top KOSPI stocks from market value API:')
    data.stocks?.forEach((s: any) => {
      console.log(`Stock: ${s.stockName} (Code: ${s.itemCode}) -> closePrice: ${s.closePrice}, compareToPreviousClosePrice: ${s.compareToPreviousClosePrice}, fluctuationsRatio: ${s.fluctuationsRatio}`)
      console.log('Raw item structure (keys):', Object.keys(s))
      console.log(`marketValue: ${s.marketValue}`)
    })
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

run()
