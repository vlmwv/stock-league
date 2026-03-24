export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error) => {
    console.error('[Nitro Server Error]:', error)
  })
})
