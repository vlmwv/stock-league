<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
    <UContainer>
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">시스템 현황 및 데이터 관리를 위한 공간입니다.</p>
        </div>
        <div class="flex gap-2">
          <UButton
            icon="i-heroicons-document-text"
            color="neutral"
            variant="ghost"
            to="/_swagger"
            target="_blank"
          >
            API Docs (Swagger)
          </UButton>
          <UButton
            icon="i-heroicons-arrow-path"
            color="primary"
            variant="soft"
            @click="refreshData"
          >
            기록 새로고침
          </UButton>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <UCard v-for="stat in stats" :key="stat.label">
          <div class="flex items-center gap-4">
            <div :class="`p-3 rounded-lg ${stat.colorClass}`">
              <UIcon :name="stat.icon" class="w-6 h-6 text-white" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">최근 활동 내역</h3>
            <USelectMenu v-model="selectedView" :options="viewOptions" />
          </div>
        </template>
        
        <UTable :rows="recentActivities" :columns="columns">
          <template #status-data="{ row }">
            <UBadge :color="row.original.status === 'success' ? 'success' : 'error'" variant="subtle">
              {{ row.original.status === 'success' ? '성공' : '실패' }}
            </UBadge>
          </template>
        </UTable>
      </UCard>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const selectedView = ref('전체')
const viewOptions = ['전체', '사용자', '시스템', '데이터']

const stats = [
  { label: '전체 사용자', value: '1,234', icon: 'i-heroicons-users', colorClass: 'bg-blue-500' },
  { label: '활성 예측', value: '456', icon: 'i-heroicons-chart-bar', colorClass: 'bg-green-500' },
  { label: '오늘의 거래', value: '₩1.2M', icon: 'i-heroicons-banknotes', colorClass: 'bg-yellow-500' },
  { label: '시스템 상태', value: '정상', icon: 'i-heroicons-check-circle', colorClass: 'bg-indigo-500' }
]

const columns = [
  { accessorKey: 'id', label: 'ID' },
  { accessorKey: 'user', label: '사용자' },
  { accessorKey: 'action', label: '활동' },
  { accessorKey: 'status', label: '상태' },
  { accessorKey: 'time', label: '시간' }
]

const recentActivities = [
  { id: 1, user: 'UserA', action: '주식 예측 완료 (AAPL)', status: 'success', time: '5분 전' },
  { id: 2, user: 'System', action: '데이터 동기화 완료', status: 'success', time: '12분 전' },
  { id: 3, user: 'UserB', action: '회원 가입', status: 'success', time: '30분 전' },
  { id: 4, user: 'Admin', action: '공지사항 수정', status: 'success', time: '1시간 전' }
]

const refreshData = () => {
  // Logic to refresh data
  console.log('Refreshing data...')
}

definePageMeta({
  layout: 'default'
})
</script>
