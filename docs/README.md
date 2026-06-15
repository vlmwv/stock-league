# 문서 색인 (docs)

니나노AI(주식 예측 리그) 프로젝트 문서 모음입니다. 파일명은 `kebab-case`로 통일했습니다.

## 활성 문서

| 문서 | 설명 |
| :--- | :--- |
| [codebase-analysis.md](codebase-analysis.md) | 코드베이스 전체 구조 분석 (계층·데이터 흐름·리스크). 구조 파악의 출발점. |
| [ai-recommendation-logic.md](ai-recommendation-logic.md) | '오늘의 예측 리그' 종목 선정 및 AI 추천 점수 산출 알고리즘. |
| [batch-verification.md](batch-verification.md) | 배치(Edge Function + pg_cron) 동작 검증·디버깅·수동 트리거 방법. |
| [secrets-guide.md](secrets-guide.md) | Supabase Edge Functions 환경 변수(Secrets) 관리 가이드. |
| [refactor-usestock-plan.md](refactor-usestock-plan.md) | `useStock.ts` 영역별 컴포저블 분리 계획 및 진행 현황. |

## 보관(archive)

착수 초기의 기획/계획 스냅샷입니다. 현재 구현과 다를 수 있으며 히스토리 보존 목적으로만 유지합니다.

| 문서 | 설명 |
| :--- | :--- |
| [archive/plan-request.md](archive/plan-request.md) | 최초 요구사항 정의. |
| [archive/architecture-recommend.md](archive/architecture-recommend.md) | 초기 아키텍처 제안. |
| [archive/plan-implementation.md](archive/plan-implementation.md) | 초기 포팅·구현 계획. |

## 그 외 (저장소 루트)

- [../README.md](../README.md) — 프로젝트 개요
- [../DEPLOY.md](../DEPLOY.md) — 배포 가이드
- [../erd.md](../erd.md) — ERD
- [../CLAUDE.md](../CLAUDE.md) — Claude Code 작업 가이드
