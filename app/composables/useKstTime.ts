// KST(Asia/Seoul) 기준 시간 유틸과 실시간 시각 상태(kstTime)를 제공한다.
// 모든 리그 타이밍(21:20 종목 선정, 08:00 예측 마감, 20:30 결과 발표)은
// 서버 TZ와 무관하게 Intl.DateTimeFormat으로 계산한 KST 기준으로 판단한다.
export const useKstTime = () => {
  const getKstDate = () => {
    // Intl.DateTimeFormat을 사용하여 시스템 TZ에 관계없이 항상 KST 날짜 반환
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
    const d = new Intl.DateTimeFormat('sv-SE', options).format(new Date())
    return d
  }

  const getKstHourMinute = () => {
    const options = { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false } as const
    const parts = new Intl.DateTimeFormat('en-GB', options).format(new Date()).split(':')
    const hour = parts[0] || '0'
    const minute = parts[1] || '0'
    return { hour: parseInt(hour), minute: parseInt(minute), timeVal: parseInt(hour) * 100 + parseInt(minute) }
  }

  const getActiveLeagueDate = () => {
    const today = getKstDate()
    const { timeVal } = getKstHourMinute()

    // 21:20 이후라면 다음날 리그가 활성 대상입니다.
    if (timeVal >= 2120) {
      const tomorrow = new Date(new Date().getTime() + (24 * 60 * 60 * 1000))
      const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
      return new Intl.DateTimeFormat('sv-SE', options).format(tomorrow)
    }
    return today
  }

  // 실시간 상태 업데이트를 위한 시간 Ref (소비 측에서 30초마다 갱신)
  const kstTime = useState('kst_time', () => getKstHourMinute())

  return { getKstDate, getKstHourMinute, getActiveLeagueDate, kstTime }
}
