import { useEffect, useRef, useState } from 'react'
import { preloadImage } from '../utils/imageQueue'
import { measureTarget } from '../utils/performance'

type Props = { src: string; preview?: string; alt: string; className: string; targetId: string }
export default function ProgressiveImage({ src, preview, alt, className, targetId }: Props) {
  const element = useRef<HTMLImageElement>(null)
  const [full, setFull] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () => {
      void preloadImage(src, 'high').then((ok) => {
        if (!cancelled && ok) setFull(src)
      })
    }
    if (!preview || !('IntersectionObserver' in window)) load()
    else {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            load()
            observer.disconnect()
          }
        },
        { rootMargin: '120px' },
      )
      if (element.current) observer.observe(element.current)
      return () => {
        cancelled = true
        observer.disconnect()
      }
    }
    return () => {
      cancelled = true
    }
  }, [src, preview])
  const shown = full === src || !preview ? src : preview
  return (
    <img
      ref={element}
      className={className}
      src={shown}
      alt={alt}
      fetchPriority="high"
      decoding="async"
      onLoad={() => {
        measureTarget(targetId, 'first-image')
        if (shown === src) measureTarget(targetId, 'full-image')
      }}
    />
  )
}
