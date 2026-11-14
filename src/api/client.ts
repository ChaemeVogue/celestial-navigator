import type { ColourKeyEntry, PassesResponse, Target } from './types'
import mockTargets from './mock/targets.json'
import mockColourKey from './mock/colourKey.json'

// The only switch between mock and real data. Set VITE_USE_MOCKS=false in .env to
// use the real API. In dev, leave VITE_API_BASE empty and the Vite proxy forwards
// /api and /media to Django; set it only when the backend lives on another host.
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

const mockPasses = import.meta.glob<PassesResponse>('./mock/passes/*.json', { import: 'default' })

// 300–600ms, so loading states are exercised from day one.
function delay<T>(value: T): Promise<T> {
  const ms = 300 + Math.random() * 300
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export async function getTargets(): Promise<Target[]> {
  if (!USE_MOCKS) return get<Target[]>('/api/targets')
  return delay(mockTargets)
}

// Django may return image paths relative to itself ("/media/m101/pass-1.png").
// Same-origin (proxy) paths are left alone; otherwise they resolve against the backend.
export function resolveImageUrl(url: string, base = API_BASE): string {
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')
  if (!base || isAbsolute) return url
  return new URL(url, `${base}/`).href
}

export async function getPasses(targetId: string): Promise<PassesResponse> {
  if (!USE_MOCKS) {
    const data = await get<PassesResponse>(`/api/targets/${encodeURIComponent(targetId)}/passes`)
    return {
      ...data,
      passes: data.passes.map((p) => ({
        ...p,
        imageUrl: resolveImageUrl(p.imageUrl),
        bandImageUrls:
          p.bandImageUrls &&
          Object.fromEntries(
            Object.entries(p.bandImageUrls).map(([band, url]) => [band, resolveImageUrl(url)]),
          ),
      })),
    }
  }
  const load = mockPasses[`./mock/passes/${targetId}.json`]
  if (!load) throw new Error(`No mock passes for target "${targetId}"`)
  return delay(await load())
}

export async function getColourKey(): Promise<ColourKeyEntry[]> {
  if (!USE_MOCKS) return get<ColourKeyEntry[]>('/api/colour-key')
  return delay(mockColourKey)
}
