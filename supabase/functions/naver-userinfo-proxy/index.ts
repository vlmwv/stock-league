import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    // 1. Authorization 헤더에서 네이버 Access Token 추출
    // Supabase GoTrue는 네이버에서 받은 AccessToken을 Authorization 헤더에 담아서 이 엔드포인트로 전송합니다.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. 네이버 공식 UserInfo API 호출
    const naverRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    const naverData = await naverRes.json();

    // 네이버 인증 실패 시 처리
    if (naverData.resultcode !== "00") {
      return new Response(JSON.stringify({ error: "Failed to fetch naver user info", details: naverData }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Supabase(OIDC 표준)가 이해할 수 있는 평탄화된(Flat) 형태로 응답 데이터 변환
    // 네이버는 `{ response: { id, email, name... } }` 형태로 보내지만,
    // Supabase는 `{ sub, email, name, picture... }` 형태를 기대합니다.
    const user = naverData.response;
    const flatUserInfo = {
      sub: user.id, // 필수: 고유 식별자 (네이버의 고유 ID)
      email: user.email,
      email_verified: !!user.email, // 이메일이 있으면 true 처리
      name: user.name || user.nickname,
      picture: user.profile_image,
      nickname: user.nickname
    };

    // 4. 변환된 데이터 반환
    return new Response(JSON.stringify(flatUserInfo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
