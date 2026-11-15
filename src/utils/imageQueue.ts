import { LruCache } from './lru'
export function frameOrder(length: number, selected: number) {
  if (!length) return []
  const current = ((selected % length) + length) % length
  return [
    ...new Set([
      current,
      (current + 1) % length,
      (current - 1 + length) % length,
      ...Array.from({ length }, (_, i) => (current + i) % length),
    ]),
  ]
}
const loaded = new Set<string>()
export const isImageReady = (src: string) => !src || loaded.has(src)
const images = new LruCache<string, Promise<boolean>>(128)
export function preloadImage(src: string, priority: 'high' | 'low' = 'low') {
  if (!src) return Promise.resolve(true)
  const existing = images.get(src)
  if (existing) return existing
  const pending = new Promise<boolean>((resolve) => {
    const image = new Image()
    image.fetchPriority = priority
    image.decoding = 'async'
    image.onload = () => {
      loaded.add(src)
      resolve(true)
    }
    image.onerror = () => {
      images.delete(src)
      resolve(false)
    }
    image.src = src
  })
  images.set(src, pending)
  return pending
}
