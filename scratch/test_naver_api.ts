
async function testFetch() {
  const url = 'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=5'
  const res = await fetch(url)
  const data = await res.json()
  console.log('First stock data:')
  console.log(JSON.stringify(data.stocks[0], null, 2))
}
testFetch()
