async function test() {
  const code = '005930'
  const url = `https://m.stock.naver.com/api/stock/${code}/integration`

  try {
    const res = await fetch(url)
    if (res.ok) {
      const data: any = await res.json()
      console.log('industryCode:', data.industryCode)
      console.log('industryCompareInfo:', JSON.stringify(data.industryCompareInfo, null, 2))
    } else {
      console.log(`Failed! Status: ${res.status}`)
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`)
  }
}

test()
