import type { Target } from '../api/types'
import type { SkySpot } from '../hooks/useExplorer'
import { formatDec, formatRA } from '../utils/coords'
import { eclipticLatitude } from '../utils/sky'
import './UnchartedSpot.css'

type Props = {
  spot: SkySpot
  nearest: { target: Target; distance: number } | null
  onSelect: (id: string) => void
  onBackToSky: () => void
}

// 0.4° → "24′", 12.3° → "12.3°"
const formatDistance = (deg: number) =>
  deg < 1 ? `${Math.round(deg * 60)}′` : `${deg.toFixed(deg < 10 ? 1 : 0)}°`

const signed = (n: number, places: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(places)}°`

// Shown in place of the instrument when typed coordinates don't match a processed target.
export default function UnchartedSpot({ spot, nearest, onSelect, onBackToSky }: Props) {
  const readouts = [
    ['Right ascension', `${formatRA(spot.ra)} · ${spot.ra.toFixed(5)}°`],
    ['Declination', `${formatDec(spot.dec)} · ${signed(spot.dec, 5)}`],
    ['From the ecliptic', signed(eclipticLatitude(spot.ra, spot.dec), 1)],
  ]

  return (
    <section className="uncharted panel" aria-labelledby="uncharted-heading">
      <div className="uncharted__head">
        <h2 id="uncharted-heading" className="panel-heading">
          Uncharted spot
        </h2>
        <button type="button" className="uncharted__back" onClick={onBackToSky}>
          <svg viewBox="0 0 24 14" aria-hidden="true">
            <path d="M2 12 L12 2 L22 12" />
          </svg>
          Sky chart
        </button>
      </div>

      <dl className="uncharted__readouts">
        {readouts.map(([label, value]) => (
          <div key={label} className="uncharted__readout">
            <dt className="label">{label}</dt>
            <dd className="data">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="uncharted__text">
        SPHEREx has photographed every part of the sky, this spot included, but its images haven’t
        been processed for Celestial Navigator yet. Once the backend is connected, they’ll be
        fetched and processed here; the first look at a new spot takes a few minutes.
      </p>

      {nearest && (
        <p className="uncharted__nearest">
          Nearest charted target: <strong>{nearest.target.name}</strong>,{' '}
          {formatDistance(nearest.distance)} away.{' '}
          <button
            type="button"
            className="uncharted__go"
            onClick={() => onSelect(nearest.target.id)}
          >
            Go to {nearest.target.name}
          </button>
        </p>
      )}
    </section>
  )
}
