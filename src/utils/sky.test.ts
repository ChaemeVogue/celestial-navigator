import { describe, expect, it } from 'vitest'
import { eclipticLatitude, eclipticToEquatorial, galacticPlaneToEquatorial, hammer } from './sky'

describe('eclipticLatitude', () => {
  it('matches the targets we processed (within precession, ~0.3°)', () => {
    expect(eclipticLatitude(56.75, 24.1167)).toBeCloseTo(4.1, 0) // M45
    expect(eclipticLatitude(83.6331, 22.0145)).toBeCloseTo(-1.3, 0) // M1
    expect(eclipticLatitude(189.9976, -11.6231)).toBeCloseTo(-6.7, 0) // M104
  })

  it('is 90° at the north ecliptic pole', () => {
    expect(eclipticLatitude(270, 66.5607)).toBeCloseTo(90, 1)
  })
})

describe('eclipticToEquatorial', () => {
  it('puts the equinoxes and solstices where they belong', () => {
    const [ra0, dec0] = eclipticToEquatorial(0, 0)
    expect(ra0).toBeCloseTo(0, 5)
    expect(dec0).toBeCloseTo(0, 5)
    const [ra90, dec90] = eclipticToEquatorial(90, 0)
    expect(ra90).toBeCloseTo(90, 5)
    expect(dec90).toBeCloseTo(23.4393, 3)
  })

  it('round-trips through eclipticLatitude', () => {
    const [ra, dec] = eclipticToEquatorial(200, 10)
    expect(eclipticLatitude(ra, dec)).toBeCloseTo(10, 5)
  })
})

describe('galacticPlaneToEquatorial', () => {
  it('finds the galactic centre in Sagittarius', () => {
    const [ra, dec] = galacticPlaneToEquatorial(0)
    expect(ra).toBeCloseTo(266.4, 1)
    expect(dec).toBeCloseTo(-28.94, 1)
  })
})

describe('hammer', () => {
  it('puts RA 12h, Dec 0 in the centre and RA increasing to the left', () => {
    expect(hammer(180, 0).x).toBeCloseTo(0, 6)
    expect(hammer(180, 0).y).toBeCloseTo(0, 6)
    expect(hammer(190, 0).x).toBeLessThan(0)
    expect(hammer(170, 0).x).toBeGreaterThan(0)
  })

  it('reaches the edges of the -1…1 box', () => {
    expect(hammer(0.0001, 0).x).toBeCloseTo(1, 3)
    expect(hammer(359.9999, 0).x).toBeCloseTo(-1, 3)
    expect(hammer(123, 90).y).toBeCloseTo(1, 6)
    expect(hammer(123, -90).y).toBeCloseTo(-1, 6)
  })
})
