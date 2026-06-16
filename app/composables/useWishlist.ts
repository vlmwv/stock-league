import { decodeHtmlEntities } from '~/utils/stock'

interface WishlistGroup {
  id: number
  user_id: string
  name: string
  icon?: string
  sort_order: number
}

interface WishlistItem {
  stock_id: number
  group_id: number
}

// 관심 종목(찜)과 폴더(그룹) 관리. 낙관적 업데이트 + 실패 시 롤백.
export const useWishlist = () => {
  const { client, toast, resolveUserId } = useStockClient()

  const hearts = useState<number[]>('wishlist', () => [])
  const wishlistGroups = useState<WishlistGroup[]>('wishlistGroups', () => [])
  const wishlistsWithGroups = useState<WishlistItem[]>('wishlistsWithGroups', () => [])
  const isWishlistFetching = useState<boolean>('isWishlistFetching', () => false)
  const isCreatingGroup = useState<boolean>('isCreatingGroup', () => false)

  const fetchWishlistGroups = async () => {
    const userId = await resolveUserId()
    if (!userId) return

    const { data, error } = await client
      .from('wishlist_groups')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      wishlistGroups.value = data as any
      console.log('[useWishlist] Wishlist groups fetched:', wishlistGroups.value)
    }

    if (error) {
      console.error('[useWishlist] fetchWishlistGroups error:', error)
    }
  }

  const createWishlistGroup = async (name: string) => {
    const userId = await resolveUserId()
    if (!userId) {
      toast.add({
        title: '로그인이 필요합니다',
        color: 'warning'
      })
      return { success: false }
    }

    const trimmedName = name.trim()
    if (!trimmedName) return { success: false }

    // 1. 중복 체크 (기존 폴더가 있는지 확인)
    const existing = wishlistGroups.value.find(g => g.name === trimmedName)
    if (existing) {
      toast.add({
        title: '이미 존재하는 폴더 이름입니다',
        color: 'warning',
        icon: 'i-heroicons-information-circle'
      })
      return { success: true, data: existing, alreadyExists: true }
    }

    if (isCreatingGroup.value) return { success: false }
    isCreatingGroup.value = true

    try {
      const { data, error } = await client
        .from('wishlist_groups')
        .insert({ user_id: userId, name: trimmedName, sort_order: wishlistGroups.value.length } as any)
        .select()
        .single()

      if (!error && data) {
        wishlistGroups.value = [...wishlistGroups.value, data as any]
        toast.add({
          title: '새 폴더가 생성되었어요',
          color: 'primary',
          icon: 'i-heroicons-folder-plus'
        })
        return { success: true, data: data as any }
      }

      if (error) {
        console.error('[useWishlist] createWishlistGroup error:', error)
        toast.add({
          title: '폴더 생성에 실패했습니다',
          description: error?.message || '알 수 없는 오류가 발생했습니다.',
          color: 'error',
          icon: 'i-heroicons-exclamation-circle'
        })
      }
      return { success: false, error }
    } finally {
      isCreatingGroup.value = false
    }
  }

  const deleteWishlistGroup = async (groupId: number) => {
    const userId = await resolveUserId()
    if (!userId) return { success: false }

    try {
      console.log(`[useWishlist] Attempting to delete wishlist group: ${groupId}`)

      // 1. 해당 폴더의 종목들을 '미분류'로 변경
      // (DB 제약조건이 ON DELETE CASCADE로 되어 있어 폴더 삭제 시 종목도 찜하기에서 해제되는 것을 방지)
      const { error: updateError } = await client
        .from('wishlists')
        .update({ group_id: null } as any)
        .eq('group_id', groupId)
        .eq('user_id', userId)

      if (updateError) {
        console.warn('[useWishlist] Failed to nullify group_id before delete (might be okay if empty):', updateError)
      }

      // 2. 폴더 삭제
      const { error } = await client
        .from('wishlist_groups')
        .delete()
        .eq('id', groupId)
        .eq('user_id', userId)

      if (!error) {
        console.log(`[useWishlist] Successfully deleted group: ${groupId}`)
        // 로컬 상태 동기화
        wishlistGroups.value = wishlistGroups.value.filter(g => g.id !== groupId)
        wishlistsWithGroups.value = wishlistsWithGroups.value.filter(w => w.group_id !== groupId)

        // hearts 업데이트 (중복 제거)
        const remainingHearts = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]
        hearts.value = remainingHearts

        toast.add({
          title: '폴더를 삭제했습니다',
          color: 'primary',
          icon: 'i-heroicons-trash'
        })
        return { success: true }
      }

      throw error
    } catch (error: any) {
      console.error('[useWishlist] deleteWishlistGroup error:', error)
      toast.add({
        title: '폴더 삭제에 실패했습니다',
        description: error?.message || '알 수 없는 오류가 발생했습니다.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
      return { success: false, error }
    }
  }

  const updateWishlistGroup = async (groupId: number, name: string) => {
    const userId = await resolveUserId()
    if (!userId) return { success: false }

    const { error } = await client
      .from('wishlist_groups')
      .update({ name } as any)
      .eq('id', groupId)

    if (!error) {
      const idx = wishlistGroups.value.findIndex(g => g.id === groupId)
      if (idx > -1) wishlistGroups.value[idx].name = name
      toast.add({
        title: '폴더 이름을 변경했습니다',
        color: 'primary',
        icon: 'i-heroicons-pencil-square'
      })
      return { success: true }
    }

    console.error('[useWishlist] updateWishlistGroup error:', error)
    toast.add({
      title: '폴더 이름 변경에 실패했습니다',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
    return { success: false, error }
  }

  const fetchWishlist = async () => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[useWishlist] Skipping fetchWishlist: No user logged in')
      hearts.value = []
      wishlistsWithGroups.value = []
      return
    }

    if (isWishlistFetching.value) {
      console.log('[useWishlist] fetchWishlist already in progress, skipping...')
      return
    }

    isWishlistFetching.value = true
    try {
      // 1. 그룹 목록 먼저 가져오기
      await fetchWishlistGroups()

      // 2. 위시리스트 데이터 가져오기
      const { data, error } = await client.from('wishlists').select('stock_id, group_id').eq('user_id', userId)

      if (!error && data) {
        wishlistsWithGroups.value = data.map((w: any) => ({
          stock_id: Number(w.stock_id),
          group_id: w.group_id ? Number(w.group_id) : null // null 허용 (이전 버전 호환성)
        }))
        hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]
        console.log('[useWishlist] Wishlist fetched:', wishlistsWithGroups.value)
      } else if (error) {
        console.error('[useWishlist] Wishlist fetch error:', error)
      }
    } finally {
      isWishlistFetching.value = false
    }
  }

  const { data: wishlistStocks, refresh: refreshWishlistStocks } = useAsyncData('wishlistStocks', async () => {
    if (hearts.value.length === 0) return []

    const { data, error } = await client
      .from('stocks')
      .select('*')
      .in('id', hearts.value)

    if (error) return []

    const stocksMap = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      last_price: s.last_price || 0,
      change_amount: s.change_amount || 0,
      change_rate: s.change_rate || 0,
      ai_recommendation_count: s.ai_recommendation_count || 0,
      ai_win_count: s.ai_win_count || 0,
      ai_processed_count: s.ai_processed_count || 0,
      summary: decodeHtmlEntities(s.summary || '')
    }))

    return stocksMap.map(s => {
      const groups = wishlistsWithGroups.value
        .filter(w => w.stock_id === Number(s.id))
        .map(w => w.group_id)
      return { ...s, group_ids: groups }
    })
  }, { watch: [hearts, wishlistsWithGroups] })

  const toggleHeart = async (stockId: number, groupId?: number, options?: { skipRefresh?: boolean }) => {
    const userId = await resolveUserId()
    if (!userId) {
      if (import.meta.client) {
        toast.add({
          title: '로그인이 필요합니다',
          description: '관심 종목 기능을 이용하려면 로그인해 주세요.',
          color: 'warning',
          icon: 'i-heroicons-user'
        })
        if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
          navigateTo('/login')
        }
      }
      return
    }

    const id = Number(stockId)
    if (isNaN(id)) return

    // groupId가 undefined인 경우 null(미지정/전체)로 처리
    const targetGroupId = groupId === undefined ? null : groupId

    const itemIdx = wishlistsWithGroups.value.findIndex(w => w.stock_id === id && w.group_id === targetGroupId)
    const isCurrentlyHeartedInGroup = itemIdx > -1

    const previousWishlists = [...wishlistsWithGroups.value]

    // 1. 낙관적 업데이트
    if (isCurrentlyHeartedInGroup) {
      wishlistsWithGroups.value = wishlistsWithGroups.value.filter((_, i) => i !== itemIdx)
    } else {
      wishlistsWithGroups.value = [...wishlistsWithGroups.value, { stock_id: id, group_id: targetGroupId }]
    }
    hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]

    try {
      if (isCurrentlyHeartedInGroup) {
        let query = client.from('wishlists').delete().eq('user_id', userId).eq('stock_id', id)

        if (targetGroupId === null) {
          query = query.is('group_id', null)
        } else {
          query = query.eq('group_id', targetGroupId)
        }

        const { error } = await query
        if (error) throw error

        toast.add({
          title: '관심 종목 폴더에서 제거했어요',
          color: 'neutral',
          icon: 'i-heroicons-heart'
        })
      } else {
        const payload: any = { user_id: userId, stock_id: id, group_id: targetGroupId }

        const { error } = await client
          .from('wishlists')
          .insert(payload)

        if (error && error.code !== '23505') throw error

        toast.add({
          title: '관심 종목 폴더에 추가했어요',
          color: 'primary',
          icon: 'i-heroicons-heart-20-solid'
        })
      }

      if (!options?.skipRefresh) {
        await fetchWishlist()
      }

    } catch (err: any) {
      console.error('[useWishlist] toggleHeart fallback! error:', err.message || err)
      wishlistsWithGroups.value = previousWishlists
      hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]

      toast.add({
        title: '찜 상태 변경에 실패했어요',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
    }
  }

  return {
    hearts,
    wishlistGroups,
    wishlistsWithGroups,
    isCreatingGroup,
    wishlistStocks,
    refreshWishlistStocks,
    fetchWishlistGroups,
    createWishlistGroup,
    deleteWishlistGroup,
    updateWishlistGroup,
    fetchWishlist,
    toggleHeart,
    isHearted: (id: number) => hearts.value.includes(Number(id))
  }
}
