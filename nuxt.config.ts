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
  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY,
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
    }
  },
  nitro: {
    experimental: {
      openAPI: true
    }
  }
})
