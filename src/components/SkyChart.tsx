import type { Target } from '../api/types'
import {
  eclipticLatitude,
  eclipticToEquatorial,
  galacticPlaneToEquatorial,
  hammer,
} from '../utils/sky'
import './SkyChart.css'

type Props = {
  targets: Target[]
  selectedTarget: Target | null
  onSelect: (id: string) => void
}

// The chart is drawn in a 200 × 100 box (the Hammer projection is exactly 2:1).
const toBox = (ra: number, dec: number) => {
  const { x, y } = hammer(ra, dec)
  return [100 + 100 * x, 50 - 50 * y] as const
}
const toPercent = (ra: number, dec: number) => {
  const [x, y] = toBox(ra, dec)
  return { left: x / 2, top: y }
}

const steps = (from: number, to: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n)

// SVG path through [ra, dec] points, lifting the pen where a line wraps off one edge onto the other.
function path(points: (readonly [number, number])[]) {
  let d = ''
  let prevX: number | null = null
  for (const [ra, dec] of points) {
    const [x, y] = toBox(ra, dec)
    d += `${prevX === null || Math.abs(x - prevX) > 50 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    prevX = x
  }
  return d
}

const EDGE = 0.01 // keep lines just inside RA 0h/24h so they don't wrap
const PARALLELS = [-60, -30, 30, 60].map((dec) =>
  path(steps(EDGE, 360 - EDGE, 120).map((ra) => [ra, dec])),
)
const EQUATOR = path(steps(EDGE, 360 - EDGE, 120).map((ra) => [ra, 0]))
const MERIDIANS = steps(30, 330, 10).map((ra) => path(steps(-89.9, 89.9, 60).map((d) => [ra, d])))
const ECLIPTIC = path(steps(0, 360, 180).map((lon) => eclipticToEquatorial(lon, 0)))
const MILKY_WAY = path(steps(0, 360, 180).map((l) => galacticPlaneToEquatorial(l)))
// ±10° of the ecliptic is about 12.3 box units tall at the centre of the chart
const BAND_WIDTH = 12.3

// Hours chosen to sit clear of the current targets
const HOUR_LABELS = [21, 15, 9, 3].map((h) => ({ text: `${h}h`, ...toPercent(h * 15, 0) }))
const ECLIPTIC_LABEL = toPercent(...eclipticToEquatorial(235, 0))
const MILKY_WAY_LABEL = toPercent(...galacticPlaneToEquatorial(100))

const describeLatitude = (lat: number) =>
  Math.abs(lat) < 0.5
    ? 'on the ecliptic'
    : `${Math.abs(lat).toFixed(0)}° ${lat > 0 ? 'north' : 'south'} of the ecliptic`

export default function SkyChart({ targets, selectedTarget, onSelect }: Props) {
  const placed = targets.map((t) => ({ target: t, ...toPercent(t.ra, t.dec) }))

  return (
    <figure className="sky-chart">
      <div className="sky-chart__map">
        <svg className="sky-chart__svg" viewBox="0 0 200 100" aria-hidden="true">
          <defs>
            <radialGradient id="sky-chart-sky">
              <stop offset="0%" stopColor="var(--sky-inner)" />
              <stop offset="100%" stopColor="var(--sky-outer)" />
            </radialGradient>
            <clipPath id="sky-chart-clip">
              <ellipse cx="100" cy="50" rx="100" ry="50" />
            </clipPath>
          </defs>
          <ellipse cx="100" cy="50" rx="100" ry="50" fill="url(#sky-chart-sky)" />
          <g clipPath="url(#sky-chart-clip)" fill="none">
            <path className="sky-chart__band" d={ECLIPTIC} strokeWidth={BAND_WIDTH} />
            {[...PARALLELS, ...MERIDIANS].map((d, i) => (
              <path key={i} className="sky-chart__grid" d={d} vectorEffect="non-scaling-stroke" />
            ))}
            <path className="sky-chart__equator" d={EQUATOR} vectorEffect="non-scaling-stroke" />
            <path
              className="sky-chart__milky-way"
              d={MILKY_WAY}
              vectorEffect="non-scaling-stroke"
            />
            <path className="sky-chart__ecliptic" d={ECLIPTIC} vectorEffect="non-scaling-stroke" />
          </g>
          <ellipse
            className="sky-chart__outline"
            cx="100"
            cy="50"
            rx="100"
            ry="50"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="sky-chart__labels" aria-hidden="true">
          {HOUR_LABELS.map((l) => (
            <span
              key={l.text}
              className="sky-chart__hour"
              style={{ left: `${l.left}%`, top: `${l.top}%` }}
            >
              {l.text}
            </span>
          ))}
          <span
            className="sky-chart__curve-label sky-chart__curve-label--ecliptic"
            style={{ left: `${ECLIPTIC_LABEL.left}%`, top: `${ECLIPTIC_LABEL.top}%` }}
          >
            Ecliptic
          </span>
          <span
            className="sky-chart__curve-label"
            style={{ left: `${MILKY_WAY_LABEL.left}%`, top: `${MILKY_WAY_LABEL.top}%` }}
          >
            Milky Way
          </span>
        </div>

        <div className="sky-chart__targets" role="group" aria-label="Targets on the sky chart">
          {placed.map(({ target, left, top }) => {
            // Put the name on the left if another target sits close by on the right (M101 and M51).
            const crowded = placed.some(
              (o) =>
                o.target !== target &&
                o.left > left &&
                o.left - left < 9 &&
                Math.abs(o.top - top) < 8,
            )
            const selected = target.id === selectedTarget?.id
            const lat = eclipticLatitude(target.ra, target.dec)
            return (
              <button
                key={target.id}
                type="button"
                className={`sky-chart__target${crowded ? ' sky-chart__target--label-left' : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-pressed={selected}
                aria-label={`${target.messier} · ${target.name}, ${describeLatitude(lat)}`}
                title={`${target.name}, ${describeLatitude(lat)}`}
                onClick={() => onSelect(target.id)}
              >
                <span className="sky-chart__dot" aria-hidden="true" />
                <span className="sky-chart__name" aria-hidden="true">
                  {target.messier}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <figcaption className="sky-chart__caption">
        <span className="sky-chart__key">
          <span className="sky-chart__swatch sky-chart__swatch--band" aria-hidden="true" />
          Within 10° of the ecliptic, where planets and most asteroids travel: the best place to
          catch something moving
        </span>
        <span className="sky-chart__key">
          <span className="sky-chart__swatch sky-chart__swatch--milky-way" aria-hidden="true" />
          Plane of the Milky Way: crowded star fields
        </span>
      </figcaption>
    </figure>
  )
}
