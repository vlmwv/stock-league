// useProfileEditForm: 프로필 수정 모달(UserProfileModal.vue)의 폼 상태·아바타 업로드·저장 로직.
// props(현재 값)와 emit(update:open/success)을 주입받아 폼을 구성하며, defineProps/defineEmits
// 매크로 자체는 컴포넌트에 남는다.
export interface ProfileEditProps {
  open: boolean
  currentUsername?: string
  currentFullName?: string
  currentGender?: string
  currentEmail?: string
  currentAvatarUrl?: string
  currentDisplayNameType?: 'nickname' | 'full_name'
}

export const useProfileEditForm = (
  props: ProfileEditProps,
  emit: (event: any, ...args: any[]) => void
) => {
  const { updateProfile } = useStock()
  const toast = useToast()
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const username = ref('')
  const fullName = ref('')
  const displayNameType = ref<'nickname' | 'full_name'>('nickname')
  const gender = ref('none')
  const imageSource = ref<'sns' | 'upload' | 'default'>('sns')
  const uploadUrl = ref('')
  const uploading = ref(false)
  const saving = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)

  const previewUrl = computed(() => {
    if (imageSource.value === 'default') return ''
    if (imageSource.value === 'sns') return user.value?.user_metadata?.avatar_url || ''
    if (imageSource.value === 'upload') return uploadUrl.value
    return ''
  })

  const sourceLabel = computed(() => {
    if (imageSource.value === 'default') return '기본 아이콘 사용 중'
    if (imageSource.value === 'sns') return 'SNS 프로필 사용 중'
    if (imageSource.value === 'upload') return '직접 업로드 이미지 사용 중'
    return '기본 아이콘 사용 중'
  })

  const sourceDescription = computed(() => {
    if (imageSource.value === 'default') return '성별에 따른 기본 아이콘을 보여줍니다.'
    if (imageSource.value === 'sns') return '가입하신 서비스의 이미지를 보여줍니다.'
    if (imageSource.value === 'upload') return '직접 업로드하신 이미지를 보여줍니다.'
    return '성별에 따른 기본 아이콘을 보여줍니다.'
  })

  const availableSources = computed(() => {
    const sources = []

    // SNS 이미지가 있을 때만 노출
    if (user.value?.user_metadata?.avatar_url) {
      sources.push({ value: 'sns', label: 'SNS 이미지', icon: 'i-heroicons-user-circle' })
    }

    sources.push({ value: 'upload', label: '직접 업로드', icon: 'i-heroicons-arrow-up-tray' })
    sources.push({ value: 'default', label: '기본 이미지', icon: 'i-heroicons-no-symbol' })

    return sources
  })

  watch(() => props.open, (val) => {
    if (val) {
      username.value = props.currentUsername || ''
      fullName.value = props.currentFullName || ''
      displayNameType.value = props.currentDisplayNameType || 'nickname'
      gender.value = props.currentGender || 'none'

      // 이미지 소스 판별
      const current = props.currentAvatarUrl
      const sns = user.value?.user_metadata?.avatar_url

      if (!current) {
        imageSource.value = 'default'
      } else {
        if (sns && current === sns) {
          imageSource.value = 'sns'
        } else {
          imageSource.value = 'upload'
          uploadUrl.value = current
        }
      }
    }
  })

  const handleSourceChange = (source: 'sns' | 'upload' | 'default') => {
    imageSource.value = source
    if (source === 'upload' && !uploadUrl.value) {
      fileInput.value?.click()
    }
  }

  const handleFileUpload = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    // 용량 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.add({ title: '2MB 이하의 이미지만 업로드 가능합니다.', color: 'error' })
      return
    }

    uploading.value = true
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar_${Date.now()}.${fileExt}`
      const filePath = `${user.value!.id}/${fileName}`

      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw new Error(`업로드 실패: ${uploadError.message}`)
      }

      const { data: { publicUrl } } = client.storage
        .from('avatars')
        .getPublicUrl(filePath)

      uploadUrl.value = publicUrl
      imageSource.value = 'upload'
      toast.add({ title: '이미지가 업로드되었습니다.', color: 'primary' })
    } catch (err: any) {
      console.error('Final catch error:', err)
      toast.add({
        title: '업로드 실패',
        description: err.message || '오류가 발생했습니다.',
        color: 'error'
      })
    } finally {
      uploading.value = false
      if (fileInput.value) fileInput.value.value = ''
    }
  }

  const handleUpdateProfile = async () => {
    const trimmedNickname = username.value.trim()
    if (!trimmedNickname) {
      toast.add({ title: '닉네임을 입력해주세요.', color: 'error' })
      return
    }

    saving.value = true

    let finalAvatarUrl: string | null = null
    if (imageSource.value !== 'default') {
      if (imageSource.value === 'sns') {
        finalAvatarUrl = user.value?.user_metadata?.avatar_url || null
      } else if (imageSource.value === 'upload') {
        finalAvatarUrl = uploadUrl.value
      }
    }

    const result = await updateProfile({
      username: trimmedNickname,
      fullName: fullName.value.trim(),
      gender: gender.value === 'none' ? null : gender.value,
      avatarUrl: finalAvatarUrl,
      displayNameType: displayNameType.value
    })

    if (result.success) {
      emit('success')
      emit('update:open', false)
      toast.add({
        title: '프로필 업데이트 성공!',
        description: '프로필 정보가 성공적으로 변경되었습니다.',
        color: 'primary',
        icon: 'i-heroicons-check-circle'
      })
    } else {
      toast.add({
        title: '프로필 업데이트 실패',
        description: result.message || '오류가 발생했습니다.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
    saving.value = false
  }

  return {
    username,
    fullName,
    displayNameType,
    gender,
    imageSource,
    uploading,
    saving,
    fileInput,
    previewUrl,
    sourceLabel,
    sourceDescription,
    availableSources,
    handleSourceChange,
    handleFileUpload,
    handleUpdateProfile
  }
}
