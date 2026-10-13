import { useEffect, useState } from 'react'

export function useOffline() {
  const [online, setOnline] = useState(navigator.onLine)
  const [ready, setReady] = useState(false)
  const [cacheError, setCacheError] = useState(false)

  useEffect(() => {
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])

  useEffect(() => {
    // Native Capacitor builds bundle assets and do not need a service worker.
    if (!import.meta.env.PROD || !['https:', 'http:'].includes(location.protocol)) return
    if (!('serviceWorker' in navigator)) return
    let cancelled = false
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).then(async () => {
      await navigator.serviceWorker.ready
      if (!cancelled) setReady(true)
    }).catch(() => {
      if (!cancelled) setCacheError(true)
    })
    return () => { cancelled = true }
  }, [])

  return { online, ready, cacheError }
}
