import { describe, expect, it } from 'vitest'
import { resolveImageUrl } from './client'

describe('resolveImageUrl', () => {
  it('leaves relative paths alone when there is no base (dev proxy)', () => {
    expect(resolveImageUrl('/media/m101/pass-1.png', '')).toBe('/media/m101/pass-1.png')
  })

  it('resolves relative paths against the backend', () => {
    const base = 'http://localhost:8000'
    expect(resolveImageUrl('/media/m101/pass-1.png', base)).toBe(
      'http://localhost:8000/media/m101/pass-1.png',
    )
    expect(resolveImageUrl('media/m101/pass-1.png', base)).toBe(
      'http://localhost:8000/media/m101/pass-1.png',
    )
  })

  it('keeps absolute URLs as they are', () => {
    const base = 'http://localhost:8000'
    for (const url of [
      'https://cdn.example.org/m101/pass-1.png',
      '//cdn.example.org/m101/pass-1.png',
      'data:image/png;base64,AAAA',
    ]) {
      expect(resolveImageUrl(url, base)).toBe(url)
    }
  })
})
