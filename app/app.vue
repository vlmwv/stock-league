<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <KakaoBrowserGuide />
    <LeagueGuide :is-open="isGuideOpen" @close="isGuideOpen = false" />
  </UApp>
</template>

<script setup lang="ts">
// Global functionality can be added here
const { isGuideOpen } = useStock()
useSeoMeta({
  title: '주식예측게임',
  ogTitle: '주식예측게임',
  description: '매일 즐기는 주식 상승/하락 예측 게임',
  ogDescription: '매일 즐기는 주식 상승/하락 예측 게임',
  ogImage: 'https://ninanoai.com/og-image.png',
  twitterCard: 'summary_large_image',
  ogType: 'website',
  ogLocale: 'ko_KR',
  ogSiteName: '주식예측게임'
})
</script>
