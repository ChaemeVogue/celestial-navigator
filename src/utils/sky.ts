// Whole-sky geometry for the sky chart. All angles are degrees, J2000.

const DEG = Math.PI / 180
const OBLIQUITY = 23.4393 * DEG // tilt of the ecliptic against the celestial equator

// North galactic pole and the galactic longitude of the north celestial pole
const NGP_RA = 192.85948 * DEG
const NGP_DEC = 27.12825 * DEG
const NCP_L = 122.93192 * DEG

const wrap360 = (deg: number) => ((deg % 360) + 360) % 360

// How far a point is from the ecliptic, the plane planets and most asteroids travel in.
export function eclipticLatitude(ra: number, dec: number): number {
  const a = ra * DEG
  const d = dec * DEG
  return (
    Math.asin(Math.sin(d) * Math.cos(OBLIQUITY) - Math.cos(d) * Math.sin(OBLIQUITY) * Math.sin(a)) /
    DEG
  )
}

// Ecliptic longitude/latitude → [ra, dec]
export function eclipticToEquatorial(lon: number, lat: number): [number, number] {
  const l = lon * DEG
  const b = lat * DEG
  const dec = Math.asin(
    Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l),
  )
  const ra = Math.atan2(
    Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY),
    Math.cos(l),
  )
  return [wrap360(ra / DEG), dec / DEG]
}

// A point on the plane of the Milky Way (galactic latitude 0) → [ra, dec]
export function galacticPlaneToEquatorial(l: number): [number, number] {
  const x = NCP_L - l * DEG
  const dec = Math.asin(Math.cos(NGP_DEC) * Math.cos(x))
  const ra = NGP_RA + Math.atan2(Math.sin(x), -Math.sin(NGP_DEC) * Math.cos(x))
  return [wrap360(ra / DEG), dec / DEG]
}

// Hammer equal-area projection of the whole sky, as seen from Earth: RA 12h in the
// centre and increasing to the left, north up. Returns x and y in -1…1 (y up).
export function hammer(ra: number, dec: number): { x: number; y: number } {
  let lon = 180 - wrap360(ra) // 0h on the right edge, 24h on the left
  if (lon <= -180) lon += 360
  const l = lon * DEG
  const d = dec * DEG
  const z = Math.sqrt(1 + Math.cos(d) * Math.cos(l / 2))
  return { x: (Math.cos(d) * Math.sin(l / 2)) / z, y: Math.sin(d) / z }
}

// Angle between two points on the sky (haversine, stable for small separations)
export function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const s =
    Math.sin(((dec2 - dec1) * DEG) / 2) ** 2 +
    Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.sin(((ra2 - ra1) * DEG) / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(s)))) / DEG
}
