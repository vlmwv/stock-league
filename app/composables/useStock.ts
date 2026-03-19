interface Stock {
  id: number
  name: string
  code: string
  last_price: number
  change_amount: number
  change_rate: number
  summary: string
}

export const useStock = () => {
  const client = useSupabaseClient()
  
  // 1. Fetch data from Supabase using useAsyncData
  const { data: stocks, refresh, error: fetchError } = useAsyncData('dailyStocks', async () => {
    const { data, error } = await client
      .from('stocks')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('Supabase Error:', error)
      return []
    }
    return data || []
  })

  // 2. Fallback to mock data if no data exists in DB
  const dailyStocks = computed(() => {
    if (stocks.value && stocks.value.length > 0) {
      return stocks.value
    }
    return [
      { id: 1, name: '삼성전자(MOCK)', code: '005930', last_price: 72500, change_amount: 1200, change_rate: 1.68, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 2, name: 'SK하이닉스(MOCK)', code: '000660', last_price: 142000, change_amount: -500, change_rate: -0.35, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 3, name: 'LG에너지솔루션(MOCK)', code: '373220', last_price: 385000, change_amount: 0, change_rate: 0.0, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 4, name: 'NAVER(MOCK)', code: '035420', last_price: 198000, change_amount: 4500, change_rate: 2.33, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 5, name: '카카오(MOCK)', code: '035720', last_price: 48000, change_amount: -200, change_rate: -0.42, summary: 'DB 데이터가 없거나 로드 전입니다.' }
    ]
  })

  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down' }[]>('myPredictions', () => [])

  const predict = (stockId: number, prediction: 'up' | 'down') => {
    if (!myPredictions.value) return
    const index = myPredictions.value.findIndex(p => p.stockId === stockId)
    if (index > -1 && myPredictions.value[index]) {
      myPredictions.value[index].prediction = prediction
    } else {
      myPredictions.value.push({ stockId, prediction })
    }
  }

  return {
    dailyStocks,
    myPredictions,
    refresh,
    fetchError,
    predict
  }
}
