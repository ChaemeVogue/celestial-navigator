import type { Target } from '../api/types'
import type { LoadStatus } from '../hooks/useExplorer'
import SkyChart from './SkyChart'
import './DomeHero.css'

type Props = {
  targets: Target[]
  targetsStatus: LoadStatus
  selectedTarget: Target | null
  onSelect: (id: string) => void
  onRetry: () => void
  onContinue: () => void // scroll to whatever comes next: the plate, or the story
}

// The landing view: the whole sky as a painted dome, and one thing to do, pick a star.
export default function DomeHero({
  targets,
  targetsStatus,
  selectedTarget,
  onSelect,
  onRetry,
  onContinue,
}: Props) {
  return (
    <header className="dome" id="dome">
      <div className="dome__cartouche">
        <p className="dome__eyebrow">A blink comparator for NASA’s SPHEREx</p>
        <h1 className="dome__title">Celestial Navigator</h1>
      </div>

      <div className="dome__chart">
        <SkyChart targets={targets} selectedTarget={selectedTarget} onSelect={onSelect} />
      </div>

      <div className="dome__prompt" aria-live="polite">
        {targetsStatus === 'error' ? (
          <p className="dome__instruction">
            The star chart couldn’t be loaded.{' '}
            <button type="button" className="dome__retry" onClick={onRetry}>
              Retry
            </button>
          </p>
        ) : (
          <p className="dome__instruction">
            {selectedTarget ? (
              <>
                Now observing <strong>{selectedTarget.name}</strong>
              </>
            ) : (
              'Choose a star to begin'
            )}
          </p>
        )}

        <label className="dome__list">
          <span>or pick from the list</span>
          <select
            className="dome__select"
            value={selectedTarget?.id ?? ''}
            disabled={targetsStatus !== 'ready'}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="" disabled>
              {targetsStatus === 'loading' ? 'Loading targets…' : 'Select a target'}
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.messier} · {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="dome__scroll" onClick={onContinue}>
        <span>{selectedTarget ? 'Continue to the plate' : 'Scroll to learn more'}</span>
        <svg className="dome__chevron" viewBox="0 0 24 14" aria-hidden="true">
          <path d="M2 2 L12 12 L22 2" />
        </svg>
      </button>
    </header>
  )
}
