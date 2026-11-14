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

export type ParsedCoordinates = { ra: number; dec: number } | { error: string }

const NUM = String.raw`(\d+(?:\.\d+)?)`
const SIGNED = String.raw`([+-]?\d+(?:\.\d+)?)`
// "08h55m10.831s -7d14m42.53s", "17 57 48.97 +04 41 36.1", "17:57:48.97 +04:41:36.1"
const SEXAGESIMAL = new RegExp(
  String.raw`^${NUM}\s*[h:\s]\s*${NUM}\s*[m:\s]\s*${NUM}\s*s?\s+([+-]?)${NUM}\s*[d°:\s]\s*${NUM}\s*[m'′:\s]\s*${NUM}\s*["″s]?$`,
  'i',
)
// "269.446 +4.768" (both in degrees)
const DECIMAL = new RegExp(String.raw`^${SIGNED}\s+${SIGNED}$`)

// Reads a typed RA/Dec pair: decimal degrees, or RA in hours and Dec in degrees
// (h/m/s and d/m/s, colons or spaces). Returns degrees, or an error to show the user.
export function parseCoordinates(input: string): ParsedCoordinates {
  const text = input
    .trim()
    .replace(/[−–]/g, '-') // typographic minus signs
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
  if (!text) return { error: 'Enter a right ascension and a declination.' }

  let ra: number
  let dec: number
  const sex = SEXAGESIMAL.exec(text)
  const decimal = DECIMAL.exec(text)
  if (sex) {
    const [h, m, s, sign, d, dm, ds] = [sex[1], sex[2], sex[3], sex[4], sex[5], sex[6], sex[7]]
    const parts = [m, s, dm, ds].map(Number)
    if (parts.some((p) => p >= 60)) return { error: 'Minutes and seconds must be under 60.' }
    if (Number(h) >= 24) return { error: 'Right ascension in hours must be under 24h.' }
    ra = (Number(h) + parts[0] / 60 + parts[1] / 3600) * 15
    dec = (sign === '-' ? -1 : 1) * (Number(d) + parts[2] / 60 + parts[3] / 3600)
  } else if (decimal) {
    ra = Number(decimal[1])
    dec = Number(decimal[2])
    if (ra < 0 || ra >= 360) return { error: 'Right ascension in degrees must be 0 to 360.' }
  } else {
    return {
      error: 'Try “269.446 +4.768” (degrees) or “17h57m47s +04d46m06s”.',
    }
  }
  if (dec < -90 || dec > 90) return { error: 'Declination must be between −90° and +90°.' }
  return { ra, dec }
}
