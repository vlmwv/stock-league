<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <KakaoBrowserGuide />
  </UApp>
</template>

<script setup lang="ts">
// Global functionality can be added here
useSeoMeta({
  title: '주식 예측 리그',
  ogTitle: '주식 예측 리그',
  description: '매일 즐기는 주식 상승/하락 예측 게임',
  ogDescription: '매일 즐기는 주식 상승/하락 예측 게임',
  ogImage: 'https://ninanoai.com/og-image.png',
  twitterCard: 'summary_large_image',
  ogType: 'website',
  ogLocale: 'ko_KR',
  ogSiteName: '주식 예측 리그'
})
</script>
