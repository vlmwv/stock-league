async function test() {
  const urls = [
    'https://m.stock.naver.com/api/sections?page=1&pageSize=50',
    'https://m.stock.naver.com/api/industry/list',
    'https://m.stock.naver.com/api/theme/list',
    'https://m.stock.naver.com/api/stocks/marketValue/KOSPI?page=1&pageSize=5'
  ]

  for (const url of urls) {
    try {
      console.log(`\nTesting URL: ${url}`)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        console.log(`Success! Data type: ${typeof data}`)
        console.log('Sample data:', JSON.stringify(data).substring(0, 500))
      } else {
        console.log(`Failed! Status: ${res.status}`)
      }
    } catch (err: any) {
      console.log(`Error: ${err.message}`)
    }
  }
}

test()
