// Decimal degrees → sexagesimal strings for the plate caption.
// Rounding happens on the total first, so 59.96s carries to the next minute
// instead of printing "60.0s".

const MINUS = '−' // U+2212, matches the decimal readouts in TargetBar

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

// 210.80227 → "14h 03m 12.5s"
export function formatRA(deg: number): string {
  const normalised = ((deg % 360) + 360) % 360
  // tenths of a second of time; 1h = 15°
  const tenths = Math.round((normalised / 15) * 36000) % (24 * 36000)
  const h = Math.floor(tenths / 36000)
  const m = Math.floor((tenths % 36000) / 600)
  const s = (tenths % 600) / 10
  return `${pad(h)}h ${pad(m)}m ${s.toFixed(1).padStart(4, '0')}s`
}

// 54.34895 → "+54° 20′ 56″", -5.3911 → "−5° 23′ 28″"
export function formatDec(deg: number): string {
  const clamped = Math.max(-90, Math.min(90, deg))
  const arcsec = Math.round(Math.abs(clamped) * 3600)
  const d = Math.floor(arcsec / 3600)
  const m = Math.floor((arcsec % 3600) / 60)
  const s = arcsec % 60
  const sign = clamped < 0 && arcsec > 0 ? MINUS : '+'
  return `${sign}${d}° ${pad(m)}′ ${pad(s)}″`
}

// 2 → "II"; passes rarely go past a handful, but this covers 1–3999.
export function toRoman(n: number): string {
  const numerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let rest = Math.floor(n)
  let out = ''
  for (const [value, numeral] of numerals) {
    while (rest >= value) {
      out += numeral
      rest -= value
    }
  }
  return out
}
