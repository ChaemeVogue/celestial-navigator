import { describe, expect, it } from 'vitest'
import { formatDec, formatRA, toRoman } from './coords'

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
