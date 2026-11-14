import { describe, expect, it } from 'vitest'
import type { Pass } from '../api/types'
import { hasBandImages, imageForBand } from './bands'

const full: Pass = {
  id: 'p1',
  label: 'Pass I',
  date: '2025-06-05T00:00:00Z',
  imageUrl: '/p1.png',
  bandImageUrls: { D1: '/p1-d1.png', D6: '/p1-d6.png' },
}
const simulated: Pass = {
  id: 'p2',
  label: 'Pass II',
  date: '2026-01-02T00:00:00Z',
  imageUrl: '/p2.svg',
}

describe('imageForBand', () => {
  it('uses the colour image when no band is chosen', () => {
    expect(imageForBand(full, null)).toBe('/p1.png')
  })

  it('picks the single-detector image, or null when the visit lacks it', () => {
    expect(imageForBand(full, 'D6')).toBe('/p1-d6.png')
    expect(imageForBand(full, 'D3')).toBeNull()
    expect(imageForBand(simulated, 'D1')).toBeNull()
  })
})

describe('hasBandImages', () => {
  it('is false for simulated targets', () => {
    expect(hasBandImages([simulated])).toBe(false)
    expect(hasBandImages([simulated, full])).toBe(true)
  })
})
