import { useEffect, useRef, useState } from 'react'

export function useNearViewport<T extends Element>(margin = '200px') {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(
    () => typeof window !== 'undefined' && !('IntersectionObserver' in window),
  )
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin: margin },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [margin])
  return [ref, seen] as const
}
