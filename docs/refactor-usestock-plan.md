# `useStock.ts` 영역별 컴포저블 분리 계획

> 작성일: 2026-06-15 · 대상: `app/composables/useStock.ts` (착수 시 2089줄, 단일 거대 컴포저블)
> 소비자: 18개 파일(페이지 10 + 컴포넌트 8)이 `useStock()` 사용

## 0. 진행 현황 (2026-06-15 기준)

- `useStock.ts` 현재 **781줄** (착수 시 2089줄).
- ✅ **1단계 완료** — 공통 헬퍼 추출: `app/utils/stockHistory.ts`(`loadRecPriceHistory`/`resolveRecPrice`로 rec_price 중복 3곳 수렴), `app/composables/useStockClient.ts`(`client`/`user`/`toast`/`resolveUserId`).
- ✅ **2단계 완료** — `app/composables/useKstTime.ts` 분리(`getKstDate`/`getKstHourMinute`/`getActiveLeagueDate`/`kstTime`). 자동 새로고침 타이머는 계획대로 아직 `useStock`에 유지.
- ✅ **3단계 완료** — 독립 도메인 5종 분리: `useRankings`, `useStockDirectory`(hearts 주입), `useAiHistory`, `useNews`, `useRecommendationAdmin`. `useStock`은 이들을 호출해 `...spread`로 합쳐 내보냄. notifications computed는 `recommended` 의존이라 파사드에 유지.
- ✅ **4단계 완료** — `useWishlist` 분리(찜/그룹 CRUD·낙관적 업데이트·`wishlistStocks`·`isHearted` 포함). 파사드는 `useWishlist()`를 호출해 `...spread`로 내보내고, 내부 참조용으로 `hearts`/`fetchWishlist`만 구조분해(refreshAll·watch·useStockDirectory 주입이 그대로 동작). `WishlistGroup`/`WishlistItem` 인터페이스도 함께 이동.
- ✅ **5단계 완료** — `useUserProfile` 분리(`fetchUserStats`+스트릭 집계, `updateProfile`, `fetchUserHistory`, `currentUserProfile` 상태). 자기완결적이라 파사드는 `...profile` 스프레드만 추가. (streak 로컬 TZ 이슈는 §5대로 별도 PR로 유지)
- ⬜ **6~8단계** `useDailyStocks`/`usePredictions`/파사드 정리 (아래 §4).
- 각 단계 후 `npm run build` 통과 확인, 파사드 반환 표면 불변 → 소비자 18곳 영향 0.

## 1. 핵심 전략 — 파사드 유지 + 무중단 점진 분리

### 왜 안전한가
- `useStock` 내부의 공유 상태는 전부 **`useState('키', …)` 전역 키** 기반이다 (`wishlist`, `myPredictions`, `wishlistGroups`, `participantCount`, `current_user_profile`, `themes_list` 등). `useState`는 키가 같으면 **어느 컴포저블에서 호출해도 동일한 인스턴스를 공유**한다.
- 따라서 로직을 새 컴포저블로 옮기더라도 **같은 `useState` 키만 유지하면 동작이 동일**하다.

### 방식
`useStock`을 **얇은 파사드**로 남긴다. 내부적으로 작은 도메인 컴포저블들을 호출해 그 반환값을 그대로 합쳐 내보낸다. 소비자(18곳)는 계속 `useStock()`만 호출하므로 **소비자 코드 변경 0**. 분리가 끝난 뒤(또는 도중에) 원하는 소비자부터 직접 `useWishlist()` 등으로 갈아타면 된다.

```ts
// 분리 후 useStock.ts (파사드)
export const useStock = () => {
  const time = useKstTime()
  const daily = useDailyStocks(time)
  const predictions = usePredictions(time, daily)
  const wishlist = useWishlist()
  const profile = useUserProfile(time)
  const rankings = useRankings()
  const news = useNews()
  const directory = useStockDirectory(wishlist)
  const aiHistory = useAiHistory(time)
  const recoAdmin = useRecommendationAdmin(time)

  // 크로스 도메인 오케스트레이션만 파사드에 남김
  const refreshAll = async () => { /* daily + predictions + wishlist 조합 */ }

  return { ...time, ...daily, ...predictions, ...wishlist, ...profile,
           ...rankings, ...news, ...directory, ...aiHistory, ...recoAdmin, refreshAll }
}
```

> 반환 객체의 키 이름은 **현재와 1:1로 동일하게** 유지한다(예: `recommendedStocks: recommended`). 기존 export 표면을 그대로 재현하는 것이 이 리팩터링의 합격 기준이다.

## 2. 도메인 분리안

| 새 컴포저블 | 옮길 내용 | 공유 state 키 |
|------------|----------|--------------|
| **`useKstTime`** (기반) | `getKstDate`, `getKstHourMinute`, `getActiveLeagueDate`, `kstTime` ref + **30초 자동 새로고침 타이머** | `kst_time` |
| **`useDailyStocks`** | `stocks`(dailyStocks asyncData), `recommended`, `marketCapStocks`, `targetedStocks`, `isLeagueOpen`, `isResultPublished`, `allPredicted` | (asyncData 키: `dailyStocks` 등) |
| **`usePredictions`** | `myPredictions`, `predict`, `fetchPredictions`, `fetchParticipantCount`, `participantCount`, `totalMemberCount`, `getPrediction*` | `myPredictions`, `participantCount`, `totalMemberCount` |
| **`useWishlist`** | `hearts`, `wishlistGroups`, `wishlistsWithGroups`, `wishlistStocks`, `toggleHeart`, `fetchWishlist`, `fetchWishlistGroups`, 그룹 CRUD, `isHearted` | `wishlist`, `wishlistGroups`, `wishlistsWithGroups`, `isWishlistFetching`, `isCreatingGroup` |
| **`useUserProfile`** | `currentUserProfile`, `fetchUserStats`, `updateProfile`, `fetchUserHistory` (+ streak 계산) | `current_user_profile` |
| **`useRankings`** | `fetchRankings` (공동순위 계산 포함) | — |
| **`useNews`** | `fetchNews`, `fetchEconomicIndicators`, `notifications`(computed), `themes`, `fetchThemes` | `themes_list`, `is_themes_loading`, `recent_indicators` |
| **`useStockDirectory`** | `fetchStocksWithStats`, `fetchStockById`, `fetchStockByCode`, `fetchPriceHistory`, `fetchGlobalAiStats` | — |
| **`useAiHistory`** | `fetchAiHistory`, `fetchAiHistoryMonthly` | — |
| **`useRecommendationAdmin`** | `reEvaluateRecommendation`, `withdrawRecommendation`, `createRecommendation` | — |

### 공통 헬퍼 추출 (중복 제거)
- **`rec_price`(추천 기준가) 계산 로직이 3곳에 복제**되어 있다: `targetedStocks`(503–515), `fetchAiHistory`(1751–1767), `fetchAiHistoryMonthly`(1876–1888). → `app/utils/stockHistory.ts`에 `resolveRecPrice(historyPrices, stockId, gameDate)` + `loadRecPriceHistory(client, stockIds, gameDates)`로 추출해 3곳에서 호출.
- `resolveUserId`(세션 하이브리드 검증)는 거의 모든 컴포저블이 쓴다 → `useAuthUser()` 또는 `useStockClient()`로 묶어 `{ client, user, toast, resolveUserId }` 제공.
- `42703` 폴백 패턴(스키마 드리프트 방어)은 그대로 유지 — 각 쿼리에 종속적이므로 추출하지 않는다.

## 3. 의존성 주의 지점 (분리 시 깨지기 쉬운 곳)

1. **`useKstTime`의 타이머가 `refresh()`를 호출** (102–105줄). `refresh`는 `useDailyStocks`에 있다 → `useKstTime`에 콜백을 주입하거나, 타이머를 `useDailyStocks` 쪽으로 옮긴다. **권장: 타이머는 `useDailyStocks`에 두고 `useKstTime`은 순수 시간 유틸만 제공.**
2. **`watch(user)` → `fetchWishlist` + `fetchPredictions` 동시 호출** (1004–1018줄). 두 도메인에 걸친다 → 파사드(`useStock`)에 남기거나 별도 `useSessionSync(wishlist, predictions)`로 분리.
3. **`refreshAll`은 daily·predictions·wishlist 3개 도메인 오케스트레이션** → 파사드에 유지.
4. **`predict`는 `dailyStocks`·`isLeagueOpen`(useDailyStocks)와 `fetchParticipantCount`(usePredictions)에 모두 의존** → `usePredictions(time, daily)`처럼 의존 컴포저블을 인자로 주입.
5. **`allPredicted`는 `dailyStocks`(daily) + `myPredictions`(predictions) 둘 다 참조** → daily/predictions 중 하나에 두되 상대를 주입. **권장: 파사드에서 computed로 조합.**
6. SSR 안전성: `process.client` 가드(타이머·watch)는 옮긴 컴포저블 안에서도 그대로 유지.

## 4. 실행 순서 (의존성 leaf → root, 각 단계 후 빌드/스모크 확인)

> 각 단계는 **파사드가 항상 동일한 반환 표면을 내보내는 상태**로 커밋한다. 단계 사이에 앱은 항상 동작한다.

1. ✅ **공통 헬퍼 추출** — `utils/stockHistory.ts`(rec_price), `useStockClient`(client/user/resolveUserId). 동작 변화 없음, diff 최소.
2. ✅ **`useKstTime`** 분리 (순수 시간 유틸). 타이머는 일단 `useStock`에 남겨둠.
3. ✅ **독립 도메인부터 이동** (다른 도메인 의존 없음 → 안전):
   - `useRankings` → `useStockDirectory` → `useAiHistory` → `useNews` → `useRecommendationAdmin`
4. ✅ **`useWishlist`** 이동 (그룹 CRUD + 낙관적 업데이트 포함, 자기완결적).
5. ✅ **`useUserProfile`** 이동 (streak 계산 시 KST 통일은 별도 PR 권장 — 아래 5번).
6. **`useDailyStocks`** 이동 + 자동 새로고침 타이머를 여기로 이관.
7. **`usePredictions`** 이동 (`useDailyStocks` 주입).
8. **파사드 정리** — `refreshAll`, `watch(user)`, `allPredicted` 조합만 남기고 `useStock`을 30~50줄 수준으로 축소.
9. (선택) 소비자 마이그레이션 — 단일 도메인만 쓰는 컴포넌트부터 직접 컴포저블로 교체 (예: `RankingUser.vue` → `useRankings`). 점진적으로, 강제 아님.

## 5. 함께 처리하면 좋은 별도 개선 (각각 독립 PR)
- **streak 계산 KST 통일** (1256줄): 현재 로컬 TZ `new Date()` 기반 → `getKstDate()` 기반으로. 분리 PR과 섞지 말 것(행동 변경이므로).
- 분리 완료 후 `42703` 폴백들이 실제 필요한지 스키마 확정 여부로 재검토.

## 6. 검증 방법 (테스트 스위트 없음 → 수동 스모크)
- `npm run build` 통과(타입 에러 0).
- 주요 플로우 수동 확인: 메인(오늘의 종목/예측) · 찜 토글/폴더 · 랭킹 · 마이페이지(통계/이력) · AI 히스토리 캘린더 · 종목 검색/상세 · 관리자.
- **합격 기준**: 파사드 `useStock()`의 반환 키 집합이 분리 전후 동일(키 누락 0). 분리 PR에서는 어떤 동작도 바뀌지 않아야 한다.

## 7. 기대 효과
- 2089줄 단일 파일 → 도메인별 100~400줄 컴포저블 9~10개 + 30~50줄 파사드.
- 도메인별 독립 수정/리뷰 가능, 머지 충돌 급감.
- rec_price 등 중복 로직 1곳으로 수렴.
- 소비자 영향 0(파사드 유지)으로 리스크 최소.
