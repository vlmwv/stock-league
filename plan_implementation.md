# [주식 예측 리그] 프로젝트 포팅 계획

`plan.md`와 제안드린 현대적 아키텍처를 결합하여, 확장성 있고 사용자 친화적인 주식 예측 서비스를 구축합니다.

## 제안된 변경 사항

### [프로젝트 초기화 및 기반 설정]

#### [NEW] [Nuxt.js + PWA 설정](./)
- Nuxt.js (v3) 기반의 프로젝트 구성.
- `@vite-pwa/nuxt`를 통한 PWA 설정 (모바일 앱 경험 제공).
- `Pinia` (상태 관리) 및 `VueUse` (제스처 핸들링) 라이브러리 연동.

### [인증 및 보안 레이어]

#### [NEW] [인증 시스템 (Supabase Auth)](./)
- **소셜 로그인 (OAuth2)**: 구글, 카카오, 네이버 등 주요 Provider 연동.
- **세션 관리**: `@nuxtjs/supabase` 모듈의 `useSupabaseUser`를 이용한 유저 상태 관리.
- **보안 로직**: 클라이언트 측 미들웨어를 통한 페이지 접근 제한 및 서버 측 세션 검증.


### [데이터 및 서버리스 레이어]

#### [NEW] [Supabase](./supabase/)
- PostgreSQL 스키마 설계 및 RLS(행 레벨 보안) 정책 적용.
- **Supabase Edge Functions**: DART/뉴스 수집, 랭킹 집계, LLM 요약 등을 처리하는 서버리스 함수 구현.
- **RLS (Row Level Security)**: `auth.uid()`를 활용하여 사용자가 본인의 예측 데이터 및 프로필만 수정 가능하도록 정책 설정.


### [백엔드 로직]

#### [NEW] [에지 함수 (Edge Functions)](./supabase/functions/)
- `collect-news`: 뉴스/공시 수집 및 LLM 기반 요약.
- `update-rankings`: 20:20 주기 랭킹 집계 및 결과 생성.
- `generate-recommendations`: 21:20 주기 LLM 추천 종목 선정.

### [프론트엔드 최적화]

#### [NEW] [핵심 페이지 및 컴포넌트](./pages/)
- `game/index.vue`: `useSwipe`를 이용한 상/하 플릭 예측 UI.
- `ranking/index.vue`: 월간/주간/실시간 랭킹 대시보드.
- `components/ResultPopup.vue`: `canvas-confetti`를 활용한 당첨 결과 애니메이션.

## 검증 계획

### 자동화 테스트
- `npm run dev`: 로컬 서버 실행 및 PWA 매니페스트 확인.
- `supabase functions serve`: 에지 함수 로컬 실행 및 로직 검증.

### 수동 검증
- 모바일 브라우저에서 상/하 플릭 제스처 반응도 테스트.
- 찜하기(롱클릭) 동작 및 하트 표시 데이터 동기화 확인.
- 결과 발표 팝업의 애니메이션 연출 확인.
