import { useEffect, useState } from 'react'
import { loadExtraction } from '../api/science'
import { spectralImage } from '../utils/spectral'

export type SpectralMap =
  | { status: 'loading'; stage?: string }
  | { status: 'ready'; url: string }
  | { status: 'offline' } // the science service (port 8001) isn't running
  | { status: 'error'; message: string }

const POLL_MS = 1000
const ready = new Map<string, string>() // target id → image, so coming back is instant

// The "All light" map for a target: the median of SPHEREx's all-sky cube across every
// visit and all 102 channels, from Daniel's science service. null target = not wanted now.
export function useSpectralMap(targetId: string | null, attempt = 0): SpectralMap | null {
  const [result, setResult] = useState<{ key: string; map: SpectralMap } | null>(null)
  const key = targetId ? `${targetId}#${attempt}` : null

  useEffect(() => {
    if (!targetId || !key || ready.has(targetId)) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const set = (map: SpectralMap) => {
      if (!cancelled) setResult({ key, map })
    }

    const poll = async (first: boolean) => {
      let data: { status?: string; stage?: string; resultUrl?: string; error?: string }
      try {
        // retry=1 asks the service to try a failed field again (first request after Try again)
        const query = new URLSearchParams({ target: targetId, radius: '30', z: '0' })
        if (first && attempt > 0) query.set('retry', '1')
        const response = await fetch(`/science/extract?${query}`)
        if (!(response.headers.get('Content-Type') ?? '').includes('application/json')) {
          return set({ status: 'offline' })
        }
        data = await response.json()
      } catch {
        return set({ status: 'offline' })
      }
      if (cancelled) return
      if (data.status === 'error') {
        return set({ status: 'error', message: data.error ?? 'The spectral map couldn’t be made.' })
      }
      // The service publishes partial results (the molecule maps first); wait for the median.
      if (data.resultUrl) {
        try {
          const extraction = await loadExtraction(data.resultUrl)
          if (cancelled) return
          if (extraction.medianValues) {
            const url = spectralImage(
              extraction.medianValues,
              extraction.width,
              extraction.height,
              true,
            )
            if (!url) return set({ status: 'error', message: 'No usable pixels in this field.' })
            ready.set(targetId, url)
            return set({ status: 'ready', url })
          }
        } catch {
          return set({ status: 'error', message: 'The spectral map couldn’t be loaded.' })
        }
      }
      set({ status: 'loading', stage: data.stage })
      timer = setTimeout(() => void poll(false), POLL_MS)
    }
    void poll(true)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [targetId, key, attempt])

  if (!targetId) return null
  const cached = ready.get(targetId)
  if (cached) return { status: 'ready', url: cached }
  return result?.key === key ? result.map : { status: 'loading' }
}
