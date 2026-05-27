import dotenv from 'dotenv'

dotenv.config()

async function run() {
  const codes = '005930,000660,373220,035420,035720'
  const naverApiUrl = `https://polling.finance.naver.com/api/realtime/domestic/stock/${codes}`
  
  console.log(`Fetching from Naver API: ${naverApiUrl}`)
  try {
    const response = await fetch(naverApiUrl)
    if (!response.ok) {
      console.error(`Error status: ${response.status}`)
      return
    }
    const data = await response.json()
    console.log('API Response structure (top-level keys):', Object.keys(data))
    if (data.datas) {
      console.log('Samsung Electronics:', JSON.stringify(data.datas[0], null, 2))
      console.log('SK Hynix:', JSON.stringify(data.datas[1], null, 2))
    } else {
      console.log('No datas array found in response:', data)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

run()
