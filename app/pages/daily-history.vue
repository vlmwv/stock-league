<script setup lang="ts">
onMounted(() => {
  navigateTo('/ai?sub=history')
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-primary animate-spin" />
  </div>
</template>
