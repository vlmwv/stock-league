import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = event.context.user

  if (!user) {
    return null
  }

  const { data, error } = await (client as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  const resolveGender = (raw: any): 'male' | 'female' | null => {
    const candidates = [
      raw?.gender,
      raw?.gender_type,
      raw?.kakao_account?.gender,
      raw?.response?.gender
    ]

    for (const candidate of candidates) {
      if (!candidate) continue
      const normalized = String(candidate).trim().toLowerCase()
      if (normalized === 'male' || normalized === 'm' || normalized === 'man' || normalized === '남' || normalized === '남자') {
        return 'male'
      }
      if (normalized === 'female' || normalized === 'f' || normalized === 'woman' || normalized === '여' || normalized === '여자') {
        return 'female'
      }
    }

    return null
  }

  // 프로필이 없는 경우 기본값 생성 및 데이터베이스 저장
  if (!data) {
    const detectedGender = resolveGender(user.user_metadata)
    const newProfile = {
      id: user.id,
      username: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '익명',
      avatar_url: user.user_metadata?.avatar_url || null,
      gender: detectedGender,
      points: 0
    }

    const { data: upsertData, error: upsertError } = await (client as any)
      .from('profiles')
      .upsert(newProfile)
      .select()
      .single()

    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      return newProfile // DB 저장 실패 시 메모리 상의 기본값이라도 반환
    }

    return upsertData
  }

  return data
})
