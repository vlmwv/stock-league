// useFearGreedIndex: info.vue 공포·탐욕 지수 게이지의 뷰 모델.
// 실데이터 연동 전 임시로 날짜 기반 의사 난수(당일 고정)로 40~80 값을 만들고, 구간별 상태/문구를 매핑한다.
export const useFearGreedIndex = () => {
  const fearGreedValue = computed(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = today.getMonth() + 1
    const dd = today.getDate()

    // 날짜 기반 의사 난수 생성
    const seed = (yyyy * 10000 + mm * 100 + dd)
    const x = Math.sin(seed) * 10000
    const randomVal = Math.floor((x - Math.floor(x)) * 40) + 40 // 40~80 사이 유도
    return randomVal
  })

  const fearGreedStatus = computed(() => {
    const val = fearGreedValue.value
    if (val <= 20) {
      return {
        label: '극도의 공포',
        english: 'Extreme Fear',
        colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        gaugeColor: '#f43f5e',
        bgColor: 'bg-rose-500/5',
        tip: '🚨 시장에 공포가 가득합니다! 역사적으로 극도의 공포 구간은 매력적인 장기 매수 기회였습니다. 감정에 휩쓸려 패닉 셀을 하기보다 가치 있는 종목의 분할 매수를 검토해 보세요.'
      }
    } else if (val <= 40) {
      return {
        label: '공포',
        english: 'Fear',
        colorClass: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        gaugeColor: '#fb923c',
        bgColor: 'bg-orange-400/5',
        tip: '⚠️ 투자 심리가 위축되어 있습니다. 단기 변동성이 커질 수 있으니 레버리지 투자를 지양하고, 현금 비중을 유지하며 우량 자산 위주로 포트폴리오를 다듬을 때입니다.'
      }
    } else if (val <= 60) {
      return {
        label: '중립',
        english: 'Neutral',
        colorClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        gaugeColor: '#fbbf24',
        bgColor: 'bg-amber-400/5',
        tip: '⚖️ 시장의 방향성이 탐색되는 중립 구간입니다. 호재와 악재가 팽팽히 맞서고 있으니 섣부른 추격 매수보다는 개별 기업의 펀더멘탈과 다가올 실적 발표에 주목하세요.'
      }
    } else if (val <= 80) {
      return {
        label: '탐욕',
        english: 'Greed',
        colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        gaugeColor: '#34d399',
        bgColor: 'bg-emerald-400/5',
        tip: '📈 투자 심리가 활발한 탐욕 구간입니다. 단기적으로 추가 상승 여력이 있을 수 있지만, 과열 조짐이 서서히 보이기 시작하므로 신규 진입 시 철저한 분할 매수로 대응하세요.'
      }
    } else {
      return {
        label: '극도의 탐욕',
        english: 'Extreme Greed',
        colorClass: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
        gaugeColor: '#818cf8',
        bgColor: 'bg-indigo-400/5',
        tip: '🔥 시장이 극도로 과열되었습니다! 남들이 탐욕을 부릴 때 두려워하라는 거장의 말처럼, 현재 구간에서는 무리한 추격 매수를 피하고 보유 자산의 일부 수익 실현을 고민해 볼 시점입니다.'
      }
    }
  })

  return { fearGreedValue, fearGreedStatus }
}
