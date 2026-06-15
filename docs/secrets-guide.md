# Supabase Edge Functions 보안 및 환경 변수(Secrets) 관리 가이드

이 문서는 프로젝트에서 사용하는 Supabase Edge Functions의 보안 설정 및 환경 변수 관리 방법을 설명합니다.

## 1. 환경 변수(Secrets)란?

Edge Functions에서 API 키(예: Gemini API), 데이터베이스 비밀번호 등 민감한 정보를 안전하게 사용하기 위해 Supabase에서 제공하는 기능입니다. 소스 코드에 직접 노출하지 않고 Supabase 서버 측에 저장하여 사용합니다.

## 2. Secrets 설정 방법 (CLI 사용)

터미널에서 `supabase secrets set` 명령어를 사용하여 설정할 수 있습니다.

```bash
# 단일 설정
npx supabase secrets set GEMINI_API_KEY=your_api_key_here

# 여러 개 동시 설정
npx supabase secrets set KEY1=VALUE1 KEY2=VALUE2
```

## 3. 설정된 Secrets 확인 및 삭제

```bash
# 목록 확인
npx supabase secrets list

# 삭제
npx supabase secrets unset KEY_NAME
```

## 4. Edge Function에서 사용하기

Deno 런타임 환경에서 `Deno.env.get()`을 사용하여 환경 변수를 읽어옵니다.

```typescript
// 예시: Gemini API 키 읽기
const apiKey = Deno.env.get('GEMINI_API_KEY');

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set');
}
```

## 5. 로컬 개발 환경에서의 설정

로컬 개발 시에는 프로젝트 루트의 `supabase/functions/.env` (또는 지정된 `.env` 파일)에 환경 변수를 정의하여 테스트할 수 있습니다.

```bash
# 로컬 실행 시 .env 파일 적용
npx supabase functions serve --env-file ./supabase/functions/.env
```

## 6. 보안 권장 사항

- **절대 커밋 금지**: `.env` 파일이나 민감한 키값이 포함된 파일은 `.gitignore`에 등록하여 Git 저장소에 올라가지 않도록 주의하세요.
- **최소 권한 원칙**: 각 에지 함수에 꼭 필요한 최소한의 Secret만 설정하고 사용하세요.
- **주기적 교체**: 보안을 위해 중요한 API 키는 주기적으로 변경하는 것이 좋습니다.
