import { describe, expect, it } from 'vitest'
import { formatDec, formatRA, parseCoordinates, toRoman } from './coords'

describe('formatRA', () => {
  it('converts the mock targets', () => {
    expect(formatRA(210.80227)).toBe('14h 03m 12.5s') // M101
    expect(formatRA(10.6847)).toBe('00h 42m 44.3s') // M31
    expect(formatRA(83.8221)).toBe('05h 35m 17.3s') // M42
  })

  it('handles the ends of the range', () => {
    expect(formatRA(0)).toBe('00h 00m 00.0s')
    expect(formatRA(359.99999)).toBe('00h 00m 00.0s') // rounds up past 24h
    expect(formatRA(360)).toBe('00h 00m 00.0s')
    expect(formatRA(-15)).toBe('23h 00m 00.0s')
  })

  it('carries rounded seconds into the next minute', () => {
    // 0h 00m 59.96s
    expect(formatRA((59.96 / 3600) * 15)).toBe('00h 01m 00.0s')
  })
})

describe('formatDec', () => {
  it('converts positive declinations', () => {
    expect(formatDec(54.34895)).toBe('+54° 20′ 56″') // M101
    expect(formatDec(41.2688)).toBe('+41° 16′ 08″') // M31
  })

  it('converts negative declinations', () => {
    expect(formatDec(-5.3911)).toBe('−5° 23′ 28″') // M42
    expect(formatDec(-11.6231)).toBe('−11° 37′ 23″') // M104
  })

  it('keeps the sign for small negatives between 0° and −1°', () => {
    expect(formatDec(-0.5)).toBe('−0° 30′ 00″')
  })

  it('does not print a minus for values that round to zero', () => {
    expect(formatDec(-0.0000001)).toBe('+0° 00′ 00″')
  })

  it('carries rounded arcseconds into the next minute and degree', () => {
    expect(formatDec(10 + 59.6 / 3600)).toBe('+10° 01′ 00″')
    expect(formatDec(-(9 + 59 / 60 + 59.7 / 3600))).toBe('−10° 00′ 00″')
  })

  it('clamps to the poles', () => {
    expect(formatDec(90)).toBe('+90° 00′ 00″')
    expect(formatDec(-95)).toBe('−90° 00′ 00″')
  })
})

describe('toRoman', () => {
  it('converts pass numbers', () => {
    expect([1, 2, 3, 4, 9, 14].map(toRoman)).toEqual(['I', 'II', 'III', 'IV', 'IX', 'XIV'])
  })
})

describe('parseCoordinates', () => {
  const close = (input: string, ra: number, dec: number) => {
    const out = parseCoordinates(input)
    if ('error' in out) throw new Error(out.error)
    expect(out.ra).toBeCloseTo(ra, 4)
    expect(out.dec).toBeCloseTo(dec, 4)
  }

  it('reads the challenge’s WISE 0855 coordinates', () => {
    close('08h55m10.831s -7d14m42.53s', 133.795129, -7.245147)
  })

  it('reads spaces, colons and typographic symbols', () => {
    close('17 57 48.97 +04 41 36.1', 269.454042, 4.693361)
    close('17:57:48.97, +04:41:36.1', 269.454042, 4.693361)
    close('08h 55m 10.831s −7° 14′ 42.53″', 133.795129, -7.245147)
  })

  it('keeps the sign of declinations just south of the equator', () => {
    close('12 00 00 -00 30 00', 180, -0.5)
  })

  it('reads decimal degrees', () => {
    close('269.446 +4.768', 269.446, 4.768)
    close('56.75, 24.1167', 56.75, 24.1167)
  })

  it('explains what is wrong', () => {
    expect(parseCoordinates('')).toHaveProperty('error')
    expect(parseCoordinates('Pleiades')).toHaveProperty('error')
    expect(parseCoordinates('400 10')).toHaveProperty('error')
    expect(parseCoordinates('10 95')).toHaveProperty('error')
    expect(parseCoordinates('25h00m00s +10d00m00s')).toHaveProperty('error')
    expect(parseCoordinates('10h61m00s +10d00m00s')).toHaveProperty('error')
  })
})
