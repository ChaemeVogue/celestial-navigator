import { expect, it } from 'vitest'
import { plotLimits, probePixel } from '../utils/plotLimits'

it('uses the requested percentile limits and excludes masked values', () => {
  const limits = plotLimits([null, 0, 10, 20, 30, NaN], false)!
  expect(limits[0]).toBeCloseTo(1.5)
  expect(limits[1]).toBeCloseTo(29.85)
})
it('excludes nonpositive pixels only for a logarithmic display', () => {
  const limits = plotLimits([-10, 0, 1, 10, 100], true)!
  expect(limits[0]).toBeCloseTo(1.9)
  expect(limits[1]).toBeCloseTo(99.82)
  expect(plotLimits([null, -1, 0], true)).toBeNull()
  expect(plotLimits([-10, 0, 1], false)?.[0]).toBeLessThan(0)
})
it('keeps constant fields renderable', () => {
  const limits = plotLimits([5, 5, 5], false)!
  expect(limits[1]).toBeGreaterThan(limits[0])
})

it('reports full-field pixels and excludes axes', () => {
  expect(probePixel(0.75, 0.8, 64, 64)).toBe(51 * 64 + 48)
  expect(probePixel(-0.1, 0.5, 64, 64)).toBeNull()
  expect(probePixel(1, 0.5, 64, 64)).toBeNull()
})
