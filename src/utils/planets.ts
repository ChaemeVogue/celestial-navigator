// Where the Sun, Moon and planets appear in the sky on a given date, as seen from Earth.
// Planets use NASA/JPL's approximate Keplerian elements ("Approximate Positions of the
// Planets", E. M. Standish, table 1, valid 1800–2050): accurate to a few arcminutes,
// far better than the sky chart needs. All angles are degrees, J2000.

const DEG = Math.PI / 180
const OBLIQUITY = 23.4393 * DEG

export type BodyId =
  'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'

export type BodyPosition = { id: BodyId; name: string; ra: number; dec: number }

// [value at J2000, change per century] for a (AU), e, I, L, long. of perihelion, long. of node
type Elements = [number, number][]
const ELEMENTS: Record<Exclude<BodyId, 'sun' | 'moon'> | 'earth', Elements> = {
  mercury: [
    [0.38709927, 0.00000037],
    [0.20563593, 0.00001906],
    [7.00497902, -0.00594749],
    [252.2503235, 149472.67411175],
    [77.45779628, 0.16047689],
    [48.33076593, -0.12534081],
  ],
  venus: [
    [0.72333566, 0.0000039],
    [0.00677672, -0.00004107],
    [3.39467605, -0.0007889],
    [181.9790995, 58517.81538729],
    [131.60246718, 0.00268329],
    [76.67984255, -0.27769418],
  ],
  earth: [
    // the Earth–Moon barycentre
    [1.00000261, 0.00000562],
    [0.01671123, -0.00004392],
    [-0.00001531, -0.01294668],
    [100.46457166, 35999.37244981],
    [102.93768193, 0.32327364],
    [0, 0],
  ],
  mars: [
    [1.52371034, 0.00001847],
    [0.0933941, 0.00007882],
    [1.84969142, -0.00813131],
    [-4.55343205, 19140.30268499],
    [-23.94362959, 0.44441088],
    [49.55953891, -0.29257343],
  ],
  jupiter: [
    [5.202887, -0.00011607],
    [0.04838624, -0.00013253],
    [1.30439695, -0.00183714],
    [34.39644051, 3034.74612775],
    [14.72847983, 0.21252668],
    [100.47390909, 0.20469106],
  ],
  saturn: [
    [9.53667594, -0.0012506],
    [0.05386179, -0.00050991],
    [2.48599187, 0.00193609],
    [49.95424423, 1222.49362201],
    [92.59887831, -0.41897216],
    [113.66242448, -0.28867794],
  ],
  uranus: [
    [19.18916464, -0.00196176],
    [0.04725744, -0.00004397],
    [0.77263783, -0.00242939],
    [313.23810451, 428.48202785],
    [170.9542763, 0.40805281],
    [74.01692503, 0.04240589],
  ],
  neptune: [
    [30.06992276, 0.00026291],
    [0.00859048, 0.00005105],
    [1.77004347, 0.00035372],
    [-55.12002969, 218.45945325],
    [44.96476227, -0.32241464],
    [131.78422574, -0.00508664],
  ],
}

const NAMES: Record<BodyId, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
}

// Julian centuries since J2000 (12:00 TT, 1 Jan 2000); the TT/UTC difference is negligible here.
const centuries = (date: Date) => (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525

const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180

// Heliocentric position in ecliptic J2000 coordinates (AU)
function heliocentric(elements: Elements, T: number): [number, number, number] {
  const [a, e, I, L, peri, node] = elements.map(([v, rate]) => v + rate * T)
  const omega = (peri - node) * DEG // argument of perihelion
  const M = wrap180(L - peri) * DEG // mean anomaly
  let E = M + e * Math.sin(M) // solve Kepler's equation
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const [cw, sw, cO, sO, cI, sI] = [omega, omega, node * DEG, node * DEG, I * DEG, I * DEG].map(
    (v, i) => (i % 2 === 0 ? Math.cos(v) : Math.sin(v)),
  )
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ]
}

// Ecliptic vector → [ra, dec]
function toRaDec([x, y, z]: [number, number, number]): [number, number] {
  const ye = y * Math.cos(OBLIQUITY) - z * Math.sin(OBLIQUITY)
  const ze = y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY)
  const ra = Math.atan2(ye, x) / DEG
  return [(ra + 360) % 360, Math.asin(ze / Math.hypot(x, ye, ze)) / DEG]
}

// Low-precision Moon (Astronomical Almanac), good to about 0.3°
function moonEcliptic(T: number): [number, number, number] {
  const s = (a: number, b: number) => Math.sin((a + b * T) * DEG)
  const lon =
    218.32 +
    481267.881 * T +
    6.29 * s(135.0, 477198.87) -
    1.27 * s(259.3, -413335.36) +
    0.66 * s(235.7, 890534.22) +
    0.21 * s(269.9, 954397.74) -
    0.19 * s(357.5, 35999.05) -
    0.11 * s(186.5, 966404.03)
  const lat =
    5.13 * s(93.3, 483202.02) +
    0.28 * s(228.2, 960400.89) -
    0.28 * s(318.3, 6003.15) -
    0.17 * s(217.6, -407332.21)
  const l = lon * DEG
  const b = lat * DEG
  return [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]
}

// Sun, Moon and the seven planets visible from Earth, in that order.
export function skyBodies(date: Date): BodyPosition[] {
  const T = centuries(date)
  const earth = heliocentric(ELEMENTS.earth, T)
  const geocentric = (id: Exclude<BodyId, 'sun' | 'moon'>) => {
    const p = heliocentric(ELEMENTS[id], T)
    return toRaDec([p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]])
  }
  const positions: [BodyId, [number, number]][] = [
    ['sun', toRaDec([-earth[0], -earth[1], -earth[2]])],
    ['moon', toRaDec(moonEcliptic(T))],
    ['mercury', geocentric('mercury')],
    ['venus', geocentric('venus')],
    ['mars', geocentric('mars')],
    ['jupiter', geocentric('jupiter')],
    ['saturn', geocentric('saturn')],
    ['uranus', geocentric('uranus')],
    ['neptune', geocentric('neptune')],
  ]
  return positions.map(([id, [ra, dec]]) => ({ id, name: NAMES[id], ra, dec }))
}
