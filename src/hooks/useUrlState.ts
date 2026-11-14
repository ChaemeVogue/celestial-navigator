import { useCallback, useEffect, useRef } from 'react'
import type { Explorer } from './useExplorer'

// Keeps the address bar in step with what's on screen, so a view can be shared or embedded:
//   ?target=barnard            a processed target
//   ?ra=133.79513&dec=-7.24515 any spot (degrees), opened like typed coordinates
// The URL is read once, when the targets have loaded, then rewritten on every change.
// Returns a function that says (once) whether the current selection came from the URL, so
// the page can jump straight to it instead of animating.
export function useUrlState(explorer: Explorer): () => boolean {
  const { targets, targetsStatus, selectedTarget, customSpot, selectTarget, goToCoordinates } =
    explorer
  const applied = useRef(false)
  const fromUrl = useRef(false)

  useEffect(() => {
    if (applied.current || targetsStatus !== 'ready') return
    applied.current = true
    const query = new URLSearchParams(window.location.search)
    const id = query.get('target')
    const ra = Number(query.get('ra'))
    const dec = Number(query.get('dec'))
    const clear = () => {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      } catch {
        // see below
      }
    }
    if (id && targets.some((t) => t.id === id)) {
      fromUrl.current = true
      selectTarget(id)
    } else if (
      query.has('ra') &&
      query.has('dec') &&
      ra >= 0 &&
      ra < 360 &&
      dec >= -90 &&
      dec <= 90
    ) {
      fromUrl.current = true
      goToCoordinates({ ra, dec })
    } else if (query.has('target') || query.has('ra') || query.has('dec')) {
      clear() // unknown target or impossible coordinates: start from the dome instead
    }
  }, [targets, targetsStatus, selectTarget, goToCoordinates])

  const selectedId = selectedTarget?.id
  useEffect(() => {
    if (!applied.current) return
    const query = new URLSearchParams()
    if (selectedId) query.set('target', selectedId)
    else if (customSpot) {
      query.set('ra', customSpot.ra.toFixed(5))
      query.set('dec', customSpot.dec.toFixed(5))
    }
    const search = query.toString()
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    try {
      window.history.replaceState(null, '', url)
    } catch {
      // Some embedded or sandboxed pages don't allow it; the app works the same without.
    }
  }, [selectedId, customSpot])

  return useCallback(() => {
    const was = fromUrl.current
    fromUrl.current = false
    return was
  }, [])
}
