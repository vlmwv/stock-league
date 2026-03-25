#!/bin/bash

# Supabase Edge Function 수동 테스트 스크립트

# .env 파일 로드 (존재하는 경우)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 환경 변수 체크
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "Please check your .env file or export variables manually."
  exit 1
fi

FUNCTION_NAME=$1

if [ -z "$FUNCTION_NAME" ]; then
  echo "Usage: ./test-batch.sh <function-name>"
  echo "Example: ./test-batch.sh calculate-rankings"
  echo ""
  echo "Available functions:"
  echo "- calculate-rankings"
  echo "- fetch-market-news-periodically"
  echo "- process-daily-results"
  echo "- select-daily-stocks"
  echo "- update-krx-top-100"
  exit 1
fi

echo "Triggering function: $FUNCTION_NAME ..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/functions/v1/$FUNCTION_NAME" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✅ Success (Status: $HTTP_STATUS)"
  echo "Response: $BODY"
else
  echo "❌ Failed (Status: $HTTP_STATUS)"
  echo "Error Response: $BODY"
fi
