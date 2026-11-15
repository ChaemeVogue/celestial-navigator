import type { KeyboardEvent } from 'react'
import type { Pass } from '../api/types'
import { formatDate } from '../utils/dates'
import './TimelinePanel.css'

type Props = {
  passes: Pass[]
  passIndex: number
  isPlaying: boolean
  canPlay: boolean // false until the selected and next images have loaded
  onSelectPass: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
}

export default function TimelinePanel({
  passes,
  passIndex,
  isPlaying,
  canPlay,
  onSelectPass,
  onPrev,
  onNext,
  onTogglePlay,
}: Props) {
  const canStep = passes.length > 1

  // Left/Right step through passes while focus is inside the list (not the whole window).
  // Focus follows the selection so repeated presses keep working.
  function handleKeyDown(e: KeyboardEvent<HTMLOListElement>) {
    if (!canStep || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    const i = (passIndex + (e.key === 'ArrowRight' ? 1 : -1) + passes.length) % passes.length
    onSelectPass(i)
    e.currentTarget.querySelectorAll('button')[i]?.focus()
  }

  return (
    <section className="timeline panel" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="panel-heading">
        Timeframes
      </h2>
      <p className="panel-intro">
        SPHEREx maps the whole sky about every six months. Step through each pass; anything that
        moves is close to home.
      </p>

      <ol
        className="timeline__list"
        role="group"
        aria-label="Passes (use the arrow keys to step)"
        onKeyDown={handleKeyDown}
      >
        {passes.map((pass, i) => (
          <li key={pass.id}>
            <button
              type="button"
              className={`timeline__pass${pass.short ? ' timeline__pass--short' : ''}`}
              aria-pressed={i === passIndex}
              onClick={() => onSelectPass(i)}
            >
              <svg className="timeline__diamond" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 1 L13 7 L7 13 L1 7 Z" />
              </svg>
              <span className="timeline__pass-label">{pass.label}</span>
              <span className="timeline__pass-date">{formatDate(pass.date)}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="timeline__controls">
        <button
          type="button"
          className="timeline__step"
          aria-label="Previous pass"
          onClick={onPrev}
          disabled={!canStep}
        >
          ◀
        </button>
        <button
          type="button"
          className="timeline__play"
          aria-pressed={isPlaying}
          onClick={onTogglePlay}
          disabled={!canStep || (!canPlay && !isPlaying)}
        >
          {isPlaying ? 'Pause' : canPlay || !canStep ? 'Play through time' : 'Loading frames…'}
        </button>
        <button
          type="button"
          className="timeline__step"
          aria-label="Next pass"
          onClick={onNext}
          disabled={!canStep}
        >
          ▶
        </button>
      </div>
    </section>
  )
}
