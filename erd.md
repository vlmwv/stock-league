# 주식 예측 리그 ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    profiles {
        uuid id PK "auth.users 연동 ID"
        text username "사용자 이름"
        text avatar_url "아바타 이미지 URL"
        int points "누적 포인트"
        timestamp created_at "생성 일시"
        timestamp updated_at "수정 일시"
    }
    stocks {
        bigint id PK "고유 ID"
        text code UK "종목 코드"
        text name "종목명"
        text sector "섹터(업종)"
        int market_cap_rank "시가총액 순위"
        int last_price "현재가/종가"
        int change_amount "변동 금액"
        numeric change_rate "변동 비율"
        timestamp updated_at "수정 일시"
    }
    daily_stocks {
        bigint id PK "고유 ID"
        bigint stock_id FK "주식 ID"
        date game_date UK "게임 일자"
        text llm_summary "LLM 추천 사유"
        text status "상태 (pending, active, closed)"
        timestamp created_at "생성 일시"
    }
    predictions {
        bigint id PK "고유 ID"
        uuid user_id FK "사용자 ID"
        bigint stock_id FK "주식 ID"
        date game_date "게임 일자"
        text prediction_type "예측 (up, down)"
        text result "결과 (pending, win, lose, draw)"
        int points_awarded "획득 포인트"
        timestamp created_at "생성 일시"
    }
    news {
        bigint id PK "고유 ID"
        bigint stock_id FK "관련 종목 ID"
        text title "제목"
        text content "내용"
        text url "원문 URL"
        text source "출처"
        timestamp published_at "발행 일시"
        text llm_summary "LLM 뉴스 요약"
        timestamp created_at "수집 일시"
    }
    wishlists {
        bigint id PK "고유 ID"
        uuid user_id FK "사용자 ID"
        bigint stock_id FK "주식 ID"
        timestamp created_at "찜한 일시"
    }
    rankings {
        bigint id PK "고유 ID"
        uuid user_id FK "사용자 ID"
        text ranking_type "타입 (weekly, monthly..)"
        text period_key "기간 키 (2024-W12..)"
        numeric win_rate "승률"
        int prediction_count "참여 횟수"
        int rank "순위"
        timestamp updated_at "집계 일시"
    }
    stock_price_history {
        bigint id PK "고유 ID"
        bigint stock_id FK "주식 ID"
        date price_date "날짜"
        int close_price "종가"
        int change_amount "변동액"
        numeric change_rate "변동률"
    }
    hall_of_fame {
        bigint id PK "고유 ID"
        uuid user_id FK "사용자 ID"
        text period_type "타입 (monthly, yearly)"
        text period_key "기간 키 (예: 2024-03, 2024)"
        int rank "최종 순위"
        numeric win_rate "승률"
        int prediction_count "참여 횟수"
        int points "획득 포인트"
        timestamp recorded_at "기록 일시"
    }

    profiles ||--o{ predictions : "performs"
    profiles ||--o{ wishlists : "has"
    profiles ||--o{ rankings : "achieves"
    stocks ||--o{ daily_stocks : "selected_for"
    stocks ||--o{ predictions : "predicted"
    stocks ||--o{ news : "mentioned_in"
    stocks ||--o{ wishlists : "added_to"
    stocks ||--o{ stock_price_history : "price_records"
    profiles ||--o{ hall_of_fame : "records"
```
