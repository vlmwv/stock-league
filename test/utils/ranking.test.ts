import { describe, it, expect } from 'vitest'
import { computeCompetitionRank } from '../../app/utils/ranking'

const entry = (over: Partial<{ win_rate: number, prediction_count: number, win_count: number, points: number }>) => ({
  win_rate: 0,
  prediction_count: 0,
  win_count: 0,
  points: 0,
  ...over
})

describe('computeCompetitionRank', () => {
  it('points(기본 rank) 정렬에서 동점은 같은 순위, 다음은 건너뛴다 (1,2,2,4)', () => {
    const results = [
      entry({ points: 100 }),
      entry({ points: 90 }),
      entry({ points: 90 }),
      entry({ points: 80 })
    ]
    expect(computeCompetitionRank(results, 'rank').map(r => r.rank)).toEqual([1, 2, 2, 4])
  })

  it('선두 동점 처리 (1,1,3)', () => {
    const results = [
      entry({ win_rate: 50 }),
      entry({ win_rate: 50 }),
      entry({ win_rate: 40 })
    ]
    expect(computeCompetitionRank(results, 'win_rate').map(r => r.rank)).toEqual([1, 1, 3])
  })

  it('sortBy에 따라 비교 필드가 달라진다 (win_count)', () => {
    const results = [
      entry({ win_count: 9, points: 1 }),
      entry({ win_count: 9, points: 999 }),
      entry({ win_count: 3, points: 500 })
    ]
    expect(computeCompetitionRank(results, 'win_count').map(r => r.rank)).toEqual([1, 1, 3])
  })

  it('전부 다른 값이면 순차 순위', () => {
    const results = [entry({ prediction_count: 5 }), entry({ prediction_count: 3 }), entry({ prediction_count: 1 })]
    expect(computeCompetitionRank(results, 'prediction_count').map(r => r.rank)).toEqual([1, 2, 3])
  })

  it('빈 배열은 빈 배열, 원본 필드는 보존', () => {
    expect(computeCompetitionRank([], 'rank')).toEqual([])
    const [first] = computeCompetitionRank([entry({ points: 7, win_rate: 33 })], 'rank')
    expect(first).toMatchObject({ points: 7, win_rate: 33, rank: 1 })
  })
})
