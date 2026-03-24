export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error) => {
    console.error('[Supabase ENV Check]:', {
      URL_EXISTS: !!(process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL),
      KEY_EXISTS: !!(process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY)
    })
    console.error('[Nitro Server Error]:', error)
  })
})
