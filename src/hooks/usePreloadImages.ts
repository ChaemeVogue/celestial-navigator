import { useEffect, useState } from 'react'
import { frameOrder, preloadImage } from '../utils/imageQueue'

// Prioritize the selected frame, then neighbours. Remaining frames warm during idle time.
export function usePreloadImages(urls: string[], selected = 0, enabled = true): boolean {
  const key = urls.join('\n')
  const selection = `${key}/${selected}`
  const [ready, setReady] = useState<string | null>(null)
  useEffect(() => {
    if (!key || !enabled) return
    let cancelled = false
    let idle: number | undefined
    const list = key.split('\n'),
      order = frameOrder(list.length, selected)
    const load = async () => {
      const first = await preloadImage(list[order[0]], 'high')
      if (cancelled || !first) return
      const next = await preloadImage(list[order[1] ?? order[0]])
      if (cancelled) return
      if (next) setReady(selection)
      if (order.length > 2) await preloadImage(list[order[2]])
      if (cancelled) return
      const background = async () => {
        for (const i of order.slice(3)) {
          if (cancelled) break
          await preloadImage(list[i])
        }
      }
      if (typeof window.requestIdleCallback === 'function')
        idle = window.requestIdleCallback(
          () => {
            void background()
          },
          { timeout: 2000 },
        )
      else
        idle = window.setTimeout(() => {
          void background()
        }, 300)
    }
    void load()
    return () => {
      cancelled = true
      if (idle !== undefined) {
        if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle)
        window.clearTimeout(idle)
      }
    }
  }, [key, selected, selection, enabled])
  return enabled && key !== '' && ready === selection
}
