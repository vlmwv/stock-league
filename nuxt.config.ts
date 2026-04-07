// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-11-01',
  css: ['~/assets/css/index.css'],
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt'
  ],
  app: {
    head: {
      title: '주식 예측 리그',
      meta: [
        { name: 'description', content: '매일 즐기는 주식 상승/하락 예측 게임' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: '주식 예측 리그' },
        { property: 'og:title', content: '주식 예측 리그' },
        { property: 'og:description', content: '매일 즐기는 주식 상승/하락 예측 게임' },
        { property: 'og:image', content: 'https://ninanoai.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:url', content: 'https://ninanoai.com' },
        { property: 'og:locale', content: 'ko_KR' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: '주식 예측 리그' },
        { name: 'twitter:description', content: '매일 즐기는 주식 상승/하락 예측 게임' },
        { name: 'twitter:image', content: 'https://ninanoai.com/og-image.png' }
      ]
    }
  },
  runtimeConfig: {
    // 런타임에 서버에서만 사용할 수 있는 비공개 환경 변수 추가
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY || '',
    supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://ninanoai.com',
      supabase: {
        url: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
        key: process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
      }
    }
  },
  supabase: {
    redirect: false // 인증 없이 메인화면 접근 가능하도록 설정
  },
  pwa: {
    manifest: {
      name: '주식 예측 리그',
      short_name: '주식예측',
      description: '매일 즐기는 주식 상승/하락 예측 게임',
      theme_color: '#ffffff',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module'
    },
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    }
  },
  nitro: {
    experimental: {
      openAPI: true
    }
  }
})
