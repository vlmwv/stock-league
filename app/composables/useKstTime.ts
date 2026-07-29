import {
  getKstDateString,
  getKstHourMinute as kstHourMinute,
  getActiveLeagueDate as activeLeagueDate
} from '~/utils/kst'

// KST(Asia/Seoul) 기준 시간 유틸과 실시간 시각 상태(kstTime)를 제공한다.
// 시각 계산 자체는 순수 함수 ~/utils/kst 에 있으며(테스트 대상), 여기서는 현재 시각(new Date())을 주입한다.
// 모든 리그 타이밍(21:20 종목 선정, 08:00 예측 마감, 20:30 결과 발표)은 KST 기준으로 판단한다.
export const useKstTime = () => {
  const getKstDate = () => getKstDateString(new Date())
  const getKstHourMinute = () => kstHourMinute(new Date())
  const getActiveLeagueDate = () => activeLeagueDate(new Date())

  // 실시간 상태 업데이트를 위한 시간 Ref (소비 측에서 30초마다 갱신)
  const kstTime = useState('kst_time', () => getKstHourMinute())

  return { getKstDate, getKstHourMinute, getActiveLeagueDate, kstTime }
}
