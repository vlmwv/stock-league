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
  
  const dailyStocks = useState<Stock[]>('dailyStocks', () => [])

  const fetchDailyStocks = async () => {
    try {
      const { data, error } = await client
        .from('stocks')
        .select('*')
        .limit(5)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        dailyStocks.value = data
      } else {
        // Fallback to mock data if database is empty
        dailyStocks.value = [
          { id: 1, name: '삼성전자', code: '005930', last_price: 72500, change_amount: 1200, change_rate: 1.68, summary: '반도체 업황 회복 기대감 지속' },
          { id: 2, name: 'SK하이닉스', code: '000660', last_price: 142000, change_amount: -500, change_rate: -0.35, summary: 'HBM 공급 확대 및 실적 개선 전망' },
          { id: 3, name: 'LG에너지솔루션', code: '373220', last_price: 385000, change_amount: 0, change_rate: 0.0, summary: '글로벌 전기차 수요 둔화 우려' },
          { id: 4, name: 'NAVER', code: '035420', last_price: 198000, change_amount: 4500, change_rate: 2.33, summary: 'AI 서비스 고도화 및 수익성 개선' },
          { id: 5, name: '카카오', code: '035720', last_price: 48000, change_amount: -200, change_rate: -0.42, summary: '경영 쇄신 및 핵심 사업 집중' }
        ]
      }
    } catch (e) {
      console.error('Failed to fetch stocks from Supabase:', e)
    }
  }

  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down' }[]>('myPredictions', () => [])

  const predict = (stockId: number, prediction: 'up' | 'down') => {
    if (!myPredictions.value) return
    const index = myPredictions.value.findIndex(p => p.stockId === stockId)
    if (index > -1) {
      myPredictions.value[index].prediction = prediction
    } else {
      myPredictions.value.push({ stockId, prediction })
    }
  }

  return {
    dailyStocks,
    myPredictions,
    fetchDailyStocks,
    predict
  }
}
