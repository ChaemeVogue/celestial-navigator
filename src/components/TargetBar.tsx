import type { Pass, Target } from '../api/types'
import type { LoadStatus } from '../hooks/useExplorer'
import { eclipticLatitude } from '../utils/sky'
import SkyChart from './SkyChart'
import './TargetBar.css'

type Props = {
  targets: Target[]
  targetsStatus: LoadStatus
  selectedTarget: Target | null
  passes: Pass[] | null // null while loading
  onSelect: (id: string) => void
  onRetry: () => void
}

const formatDegrees = (n: number, signed = false, places = 5) =>
  `${signed && n >= 0 ? '+' : ''}${n < 0 ? '−' : ''}${Math.abs(n).toFixed(places)}°`

const plural = (n: number, word: string, words: string) => `${n} ${n === 1 ? word : words}`

// "3 passes", or "3 passes + 1 short visit"
function describePasses(passes: Pass[]) {
  const short = passes.filter((p) => p.short).length
  const full = plural(passes.length - short, 'pass', 'passes')
  return short ? `${full} + ${plural(short, 'short visit', 'short visits')}` : full
}

export default function TargetBar({
  targets,
  targetsStatus,
  selectedTarget,
  passes,
  onSelect,
  onRetry,
}: Props) {
  return (
    <section className="target-bar panel" aria-label="Target">
      <div className="target-bar__controls">
        <div className="target-bar__picker">
          <label className="label" htmlFor="target-select">
            Set course for a target
          </label>
          {targetsStatus === 'error' ? (
            <p className="target-bar__error">
              Couldn’t load targets.{' '}
              <button type="button" className="target-bar__retry" onClick={onRetry}>
                Retry
              </button>
            </p>
          ) : (
            <select
              id="target-select"
              className="target-bar__select"
              value={selectedTarget?.id ?? ''}
              disabled={targetsStatus === 'loading'}
              onChange={(e) => onSelect(e.target.value)}
            >
              {targetsStatus === 'loading' && <option value="">Loading targets…</option>}
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.messier} · {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <dl className="target-bar__readouts" aria-live="polite">
          <div className="target-bar__readout">
            <dt className="label">Right Ascension</dt>
            <dd>
              <output className="data">
                {selectedTarget ? formatDegrees(selectedTarget.ra) : '—'}
              </output>
            </dd>
          </div>
          <div className="target-bar__readout">
            <dt className="label">Declination</dt>
            <dd>
              <output className="data">
                {selectedTarget ? formatDegrees(selectedTarget.dec, true) : '—'}
              </output>
            </dd>
          </div>
          <div className="target-bar__readout">
            <dt className="label">From the ecliptic</dt>
            <dd>
              <output className="data">
                {selectedTarget
                  ? formatDegrees(eclipticLatitude(selectedTarget.ra, selectedTarget.dec), true, 1)
                  : '—'}
              </output>
            </dd>
          </div>
          <div className="target-bar__readout">
            <dt className="label">Passes on file</dt>
            <dd>
              <output className="data">{passes ? describePasses(passes) : '—'}</output>
            </dd>
          </div>
        </dl>
      </div>

      <div className="target-bar__chart">
        <p className="label">Or pick from the sky</p>
        <SkyChart targets={targets} selectedTarget={selectedTarget} onSelect={onSelect} />
      </div>
    </section>
  )
}
