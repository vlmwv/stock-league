export const useUtils = () => {
  const formatDate = (date: string | Date) => {
    if (!date) return '-'
    const d = new Date(date)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)
  }

  const formatTime = (date: string | Date) => {
    if (!date) return '-'
    const d = new Date(date)
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(value)
  }

  return {
    formatDate,
    formatTime,
    formatCurrency
  }
}
