// Runs independently of the React bundle, so failed assets leave a recovery UI.
(() => {
  function offerReload() {
    const message = document.getElementById('app-loading-message')
    if (!message) return // React has already mounted.
    message.textContent = 'The app could not finish loading. Connect to the internet and try reloading it.'
    document.getElementById('app-reload').hidden = false
    document.getElementById('app-reload-note').hidden = false
  }

  window.addEventListener('error', offerReload, true)
  window.addEventListener('unhandledrejection', offerReload)
  setTimeout(offerReload, 15000)

  document.getElementById('app-reload').addEventListener('click', async (event) => {
    const button = event.currentTarget
    button.disabled = true
    try {
      const base = new URL('./', document.querySelector('link[rel="manifest"]').href).href
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.filter((registration) => registration.scope === base)
          .map((registration) => registration.unregister()))
      }
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.filter((name) => name.startsWith('flight-briefing-'))
          .map((name) => caches.delete(name)))
      }
      // Preserve IndexedDB (saved PDF, edits, checklist) and localStorage (theme).
      const url = new URL(window.location.href)
      url.searchParams.set('app-reload', Date.now())
      window.location.replace(url.href)
    } catch {
      document.getElementById('app-loading-message').textContent = 'Could not reload automatically. Close all app tabs, then reopen the app online.'
      button.disabled = false
    }
  })
})()
