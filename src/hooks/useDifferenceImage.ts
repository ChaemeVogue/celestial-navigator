import { useEffect, useState } from 'react'
import { makeDifferenceImage } from '../utils/difference'

export type DifferenceImage =
  { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' }

// Makes the difference plate for two single-detector images (earlier, later). Null URLs mean
// there's nothing to compare. A change of URLs ignores any result still on its way.
export function useDifferenceImage(earlierUrl: string | null, laterUrl: string | null) {
  const key = earlierUrl && laterUrl ? `${earlierUrl}|${laterUrl}` : null
  const [result, setResult] = useState<{ key: string; image: DifferenceImage } | null>(null)

  useEffect(() => {
    if (!earlierUrl || !laterUrl || !key) return
    let cancelled = false
    makeDifferenceImage(earlierUrl, laterUrl)
      .then((url) => {
        if (!cancelled) setResult({ key, image: { status: 'ready', url } })
      })
      .catch(() => {
        if (!cancelled) setResult({ key, image: { status: 'error' } })
      })
    return () => {
      cancelled = true
    }
  }, [earlierUrl, laterUrl, key])

  if (!key) return null
  return result?.key === key ? result.image : ({ status: 'loading' } as const)
}
