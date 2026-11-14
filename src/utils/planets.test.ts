import { describe, expect, it } from 'vitest'
import { skyBodies } from './planets'

// Reference positions from astropy's built-in ephemeris (get_body), [ra, dec] in degrees.
const REFERENCE: Record<string, Record<string, [number, number]>> = {
  '2025-06-15T00:00:00Z': {
    sun: [83.26, 23.29],
    moon: [309.97, -22.08],
    mercury: [102.41, 24.98],
    venus: [37.06, 11.87],
    mars: [150.93, 13.22],
    jupiter: [90.88, 23.28],
    saturn: [1.7, -1.62],
    uranus: [56.34, 19.62],
    neptune: [2.09, -0.52],
  },
  '2026-11-14T00:00:00Z': {
    sun: [228.82, -18.07],
    moon: [284.7, -26.11],
    mercury: [213.11, -11.1],
    venus: [200.17, -10.29],
    mars: [147.44, 15.14],
    jupiter: [147.84, 13.78],
    saturn: [8.58, 0.81],
    uranus: [61.82, 20.76],
    neptune: [1.91, -0.71],
  },
}

// Angle between two sky positions, in degrees
function separation([ra1, dec1]: [number, number], [ra2, dec2]: [number, number]) {
  const r = Math.PI / 180
  const cos =
    Math.sin(dec1 * r) * Math.sin(dec2 * r) +
    Math.cos(dec1 * r) * Math.cos(dec2 * r) * Math.cos((ra1 - ra2) * r)
  return Math.acos(Math.min(1, cos)) / r
}

describe('skyBodies', () => {
  for (const [date, expected] of Object.entries(REFERENCE)) {
    it(`matches astropy on ${date.slice(0, 10)}`, () => {
      for (const body of skyBodies(new Date(date))) {
        // The Moon moves fast and uses a short formula; everything else is far closer
        const tolerance = body.id === 'moon' ? 0.7 : 0.25
        expect(separation([body.ra, body.dec], expected[body.id]), body.name).toBeLessThan(
          tolerance,
        )
      }
    })
  }

  it('returns the Sun, Moon and seven planets', () => {
    expect(skyBodies(new Date()).map((b) => b.name)).toEqual([
      'Sun',
      'Moon',
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ])
  })
})
