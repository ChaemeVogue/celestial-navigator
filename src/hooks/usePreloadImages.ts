import { useEffect, useState } from 'react'

// Preloads every URL and reports true once all have loaded (or failed), so
// playback can wait until frames are cached and won't flicker.
export function usePreloadImages(urls: string[]): boolean {
  const key = urls.join('\n')
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const loads = key.split('\n').map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = img.onerror = () => resolve()
          img.src = src
        }),
    )
    Promise.all(loads).then(() => {
      if (!cancelled) setLoadedKey(key)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return key !== '' && loadedKey === key
}
