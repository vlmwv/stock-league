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
  title: '니나노AI',
  ogTitle: '니나노AI',
  description: '니나노AI와 함께 즐기는 주식 상승/하락 예측 및 테마 분석 서비스',
  ogDescription: '니나노AI와 함께 즐기는 주식 상승/하락 예측 및 테마 분석 서비스',
  ogImage: 'https://ninanoai.com/og-image.png',
  twitterCard: 'summary_large_image',
  ogType: 'website',
  ogLocale: 'ko_KR',
  ogSiteName: '니나노AI'
})
</script>
