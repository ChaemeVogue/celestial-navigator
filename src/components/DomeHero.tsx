import { useEffect, useMemo, useState } from 'react'
import type { Target } from '../api/types'
import type { LoadStatus, SkySpot } from '../hooks/useExplorer'
import { formatDec, formatRA, parseCoordinates } from '../utils/coords'
import { formatDate } from '../utils/dates'
import { skyBodies } from '../utils/planets'
import SkyChart from './SkyChart'
import './DomeHero.css'

type Props = {
  targets: Target[]
  targetsStatus: LoadStatus
  selectedTarget: Target | null
  customSpot: SkySpot | null // typed coordinates with no processed target
  onSelect: (id: string) => void
  onGoTo: (spot: SkySpot) => void
  onRetry: () => void
  onContinue: () => void // scroll to whatever comes next: the plate, or the story
}

const DAY_MS = 86400000
// The slider covers SPHEREx's mission so far: launch (11 March 2025) to two years on.
const MISSION_START = Date.UTC(2025, 2, 11)
const MISSION_DAYS = 730
// About a week per second: slow enough to follow the Moon and see Mars drift
const PLAY_STEP_DAYS = 1
const PLAY_INTERVAL_MS = 140

const todayIndex = () =>
  Math.min(MISSION_DAYS, Math.max(0, Math.round((Date.now() - MISSION_START) / DAY_MS)))

// The landing view: the whole sky as a painted dome, and one thing to do, pick a star.
export default function DomeHero({
  targets,
  targetsStatus,
  selectedTarget,
  customSpot,
  onSelect,
  onGoTo,
  onRetry,
  onContinue,
}: Props) {
  const [coordsText, setCoordsText] = useState('')
  const [coordsError, setCoordsError] = useState<string | null>(null)

  // Planets on the chart move with this date (days since launch)
  const [day, setDay] = useState(todayIndex)
  const [playing, setPlaying] = useState(false)
  const date = new Date(MISSION_START + day * DAY_MS)
  const bodies = useMemo(() => skyBodies(new Date(MISSION_START + day * DAY_MS)), [day])

  // Play sweeps the date forward a day per tick and stops at the end.
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setDay((d) => {
        if (d + PLAY_STEP_DAYS >= MISSION_DAYS) {
          setPlaying(false)
          return MISSION_DAYS
        }
        return d + PLAY_STEP_DAYS
      })
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [playing])

  // Sits in the chart's key row, so it doesn't add another line under the dome
  const dateControl = (
    <div className="dome__date">
      <label className="dome__date-label" htmlFor="planet-date">
        Planets on <strong>{formatDate(date.toISOString())}</strong>
      </label>
      <div className="dome__date-controls">
        <button
          type="button"
          className="dome__date-button"
          aria-pressed={playing}
          onClick={() => {
            if (!playing && day >= MISSION_DAYS) setDay(0)
            setPlaying((p) => !p)
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          id="planet-date"
          className="dome__date-range"
          type="range"
          min={0}
          max={MISSION_DAYS}
          value={day}
          aria-valuetext={formatDate(date.toISOString())}
          onChange={(e) => {
            setPlaying(false)
            setDay(Number(e.target.value))
          }}
        />
        <button
          type="button"
          className="dome__date-button"
          onClick={() => {
            setPlaying(false)
            setDay(todayIndex())
          }}
        >
          Today
        </button>
      </div>
    </div>
  )

  return (
    <header className="dome" id="dome">
      <div className="dome__cartouche">
        <p className="dome__eyebrow">A blink comparator for NASA’s SPHEREx</p>
        <h1 className="dome__title">Celestial Navigator</h1>
      </div>

      <div className="dome__chart">
        <SkyChart
          targets={targets}
          selectedTarget={selectedTarget}
          bodies={bodies}
          spot={customSpot}
          onSelect={onSelect}
          footer={dateControl}
        />
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
            ) : customSpot ? (
              <>
                Uncharted spot{' '}
                <strong className="dome__instruction-coords">
                  {formatRA(customSpot.ra)} {formatDec(customSpot.dec)}
                </strong>
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

        <form
          className="dome__coords"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            const parsed = parseCoordinates(coordsText)
            if ('error' in parsed) {
              setCoordsError(parsed.error)
              return
            }
            setCoordsError(null)
            onGoTo(parsed)
          }}
        >
          <label htmlFor="coords-input">or enter coordinates</label>
          <span className="dome__coords-field">
            <input
              id="coords-input"
              className="dome__coords-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. 269.446 +4.768"
              value={coordsText}
              aria-invalid={coordsError ? true : undefined}
              aria-describedby={coordsError ? 'coords-error' : undefined}
              onChange={(e) => {
                setCoordsText(e.target.value)
                setCoordsError(null)
              }}
            />
            <button type="submit" className="dome__coords-go">
              Go
            </button>
          </span>
          {coordsError && (
            <p id="coords-error" className="dome__coords-error" role="alert">
              {coordsError}
            </p>
          )}
        </form>
      </div>

      <button type="button" className="dome__scroll" onClick={onContinue}>
        <span>
          {selectedTarget
            ? 'Continue to the plate'
            : customSpot
              ? 'Continue to the spot'
              : 'Scroll to learn more'}
        </span>
        <svg className="dome__chevron" viewBox="0 0 24 14" aria-hidden="true">
          <path d="M2 2 L12 12 L22 2" />
        </svg>
      </button>
    </header>
  )
}
