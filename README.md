# 주식 예측 리그 (Stock Prediction League)

## 1. 프로젝트 설명
매일 5개의 종목을 선정하여 유저들이 주가의 상승 및 하락을 예측하는 게임 서비스입니다.
- 매일 08:00~20:00: 10/30/50분마다 전자공시 및 뉴스 수집
- 매일 20:20: 시세 확인 및 저장, 정답자 확인, 랭킹 집계
- 매일 20:40: KRX 상위 100종목 정보 업데이트
- 매일 21:00: 결과 노출
- 매일 21:20: 다음 날 게임을 위한 5개 종목 선정 및 LLM 요약
- 매일 22:00 ~ 익일 08:00: 5개 종목에 대한 유저 예측 진행

## 2. 기술 스택
- **Frontend**: Nuxt.js (Vue 3), TypeScript, NuxtUI, Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL, Edge Functions, Auth)
- **Deployment**: Vercel 연동, Docker Compose (로컬 환경)
- **기타**: VueUse, Pinia, PWA 지원

## 3. 주요 기능
- **회원 관리**: 이메일 가입 및 OAuth2 소셜 로그인 지원, JWT 토큰 인가
- **게임 참여**: 위/아래 플릭(Flick) 제스처를 통한 직관적인 상승/하락 예측
- **종목 추천 및 요약**: LLM을 활용한 종목 뉴스 및 공시 요약 정보 제공
- **찜하기**: 롱클릭을 통하여 관심 종목 찜하기 기능 지원
- **랭킹 시스템**: 주간/월간/연간/역대 랭킹 집계 (기본 랭킹은 월간 승률 기준)
- **결과 연출**: 유저 예측 결과 및 랭킹 상승을 보여주는 드라마틱한 팝업 애니메이션 효과

## 4. 로컬 실행 방법

종속성 설치:
```bash
npm install
```

개발 서버 실행 (http://localhost:3000):
```bash
npm run dev
```

## 5. 관련 문서
- [기획 및 요구사항](plan_request.md)
- [아키텍처 추천](architecture_recommend.md)
- [포팅 및 구현 계획](plan_implementation.md)
- [ERD (Entity Relationship Diagram)](erd.md)
- [작업 목록(Task)](task.md)
