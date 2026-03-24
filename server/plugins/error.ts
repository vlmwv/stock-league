export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, { event }) => {
    console.error('[Nitro Server Error]:', error)
  })
})
