// 공동 순위(Competition Ranking) 계산 순수 함수.
// useRankings의 fetchRankings에서 데이터 페칭과 얽혀 있던 순위 계산 로직을 추출한 것이다.

export type RankSortBy = 'win_rate' | 'prediction_count' | 'win_count' | 'rank'

export interface RankableEntry {
  win_rate: number
  prediction_count: number
  win_count: number
  points: number
}

// sortBy 기준으로 이미 정렬된 결과에 공동 순위를 부여한다.
// 같은 값이면 동일 순위, 다음 값은 건너뛴 순위(예: 1, 2, 2, 4).
export const computeCompetitionRank = <T extends RankableEntry>(
  results: T[],
  sortBy: RankSortBy
): (T & { rank: number })[] => {
  let lastValue = -1
  let lastRank = 0
  return results.map((r, i) => {
    const currentValue = sortBy === 'win_rate'
      ? r.win_rate
      : sortBy === 'prediction_count'
        ? r.prediction_count
        : sortBy === 'win_count'
          ? r.win_count
          : r.points

    if (currentValue !== lastValue) {
      lastRank = i + 1
      lastValue = currentValue
    }
    return { ...r, rank: lastRank }
  })
}
