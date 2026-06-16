// https://eslint.nuxt.com
// @nuxt/eslint 모듈이 nuxt prepare 시 ./.nuxt/eslint.config.mjs(프로젝트 설정 반영)를 생성한다.
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // 점진 도입: 기존 코드베이스가 any/단일어 컴포넌트명을 광범위하게 쓰므로
  // 초기엔 해당 규칙을 완화해 신규 코드부터 린트가 의미 있게 동작하도록 한다.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    // 유지보수 스크립트·실험용·빌드 산출물은 린트 대상에서 제외
    ignores: ['scripts/**', 'scratch/**', 'appDataDir/**', '.output/**', '.nuxt/**', 'dist/**', 'supabase/**']
  }
)
