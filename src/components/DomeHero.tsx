import { useEffect, useMemo, useState } from 'react'
import type { Target } from '../api/types'
import type { LoadStatus } from '../hooks/useExplorer'
import { formatDate } from '../utils/dates'
import { skyBodies } from '../utils/planets'
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
  onSelect,
  onRetry,
  onContinue,
}: Props) {
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
