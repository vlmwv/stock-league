import { defineVitestConfig } from '@nuxt/test-utils/config'

// 기본 환경은 node(순수 로직 유닛 테스트용 — 빠르고 Nuxt 런타임 불필요).
// 컴포저블/auto-import 등 Nuxt 런타임이 필요한 테스트는 파일 상단에
//   // @vitest-environment nuxt
// 주석을 추가해 개별 전환한다. (defineVitestConfig가 Nuxt alias·환경을 제공)
export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts']
  }
})
