import { describe, expect, it } from 'vitest'
import { differencePixels } from './difference'

// One greyscale RGBA pixel
const grey = (v: number) => new Uint8ClampedArray([v, v, v, 255])

describe('differencePixels', () => {
  it('turns anything that stayed the same black', () => {
    expect([...differencePixels(grey(180), grey(180))]).toEqual([0, 0, 0, 255])
  })

  it('shows amber where the earlier pass was brighter (where something was)', () => {
    const [r, g, b] = differencePixels(grey(200), grey(50))
    expect(r).toBe(255)
    expect(g).toBeGreaterThan(100)
    expect(b).toBe(0)
  })

  it('shows blue where the later pass is brighter (where it is now)', () => {
    const [r, g, b] = differencePixels(grey(50), grey(200))
    expect(b).toBe(255)
    expect(b).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(r)
  })
})
