export const useStock = () => {
  const dailyStocks = useState('dailyStocks', () => [
    { id: 1, name: '삼성전자', code: '005930', price: 72500, change: 1200, changeRate: 1.68, summary: '반도체 업황 회복 기대감 지속', trend: 'up' },
    { id: 2, name: 'SK하이닉스', code: '000660', price: 142000, change: -500, changeRate: -0.35, summary: 'HBM 공급 확대 및 실적 개선 전망', trend: 'down' },
    { id: 3, name: 'LG에너지솔루션', code: '373220', price: 385000, change: 0, changeRate: 0.0, summary: '글로벌 전기차 수요 둔화 우려', trend: 'up' },
    { id: 4, name: 'NAVER', code: '035420', price: 198000, change: 4500, changeRate: 2.33, summary: 'AI 서비스 고도화 및 수익성 개선', trend: 'up' },
    { id: 5, name: '카카오', code: '035720', price: 48000, change: -200, changeRate: -0.42, summary: '경영 쇄신 및 핵심 사업 집중', trend: 'down' }
  ])

  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down' }[]>('myPredictions', () => [])

  const predict = (stockId: number, prediction: 'up' | 'down') => {
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
    predict
  }
}
