import { useState } from 'react'
import type { Pass } from '../api/types'
import type { Comparison } from '../hooks/useExplorer'
import { formatDate } from '../utils/dates'
import './DifferencePanel.css'

type Props = {
  passes: Pass[]
  bands: string[] // detector ids in colour-key order: ["D1", "D3", "D6"]
  comparison: Comparison // what the plate shows now
  onShow: (comparison: Comparison) => void
}

const LEGEND = [
  {
    swatch: 'none',
    name: 'Black',
    text: 'Nothing changed. Galaxies and distant stars look the same in both passes, so they cancel out.',
  },
  {
    swatch: 'moved',
    name: 'Amber and blue side by side',
    text: 'Something moved. Amber marks where it was in the earlier pass, blue where it is in the later one. The step from amber to blue is the way it travelled.',
  },
  { swatch: 'dimmer', name: 'Amber on its own', text: 'Something got dimmer without moving.' },
  { swatch: 'brighter', name: 'Blue on its own', text: 'Something got brighter without moving.' },
  {
    swatch: 'ring',
    name: 'A faint ring around a bright star',
    text: 'Often left over because the two passes were photographed at slightly different angles. It could also be something real: compare with the Blink view and decide.',
  },
]

const hasBand = (pass: Pass | undefined, band: string) => Boolean(pass?.bandImageUrls?.[band])

// The side panel in the Difference view: choose two passes and a detector, then press Show.
// Nothing on the plate changes until Show is pressed.
export default function DifferencePanel({ passes, bands, comparison, onShow }: Props) {
  const [picked, setPicked] = useState<number[]>([comparison.from, comparison.to])
  const [band, setBand] = useState(comparison.band)

  const [from, to] = [...picked].sort((a, b) => a - b) // always earlier first
  const ready = picked.length === 2
  const missing = ready ? [from, to].filter((i) => !hasBand(passes[i], band)) : []
  const valid = ready && missing.length === 0
  const unchanged =
    valid && from === comparison.from && to === comparison.to && band === comparison.band

  const togglePass = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < 2 ? [...p, i] : p))

  let status: string
  if (picked.length < 2) status = `Pick ${picked.length === 0 ? 'two passes' : 'one more pass'}.`
  else if (missing.length)
    status = `${missing.map((i) => passes[i].label).join(' and ')} ${missing.length > 1 ? 'have' : 'has'} no ${band} images. Pick another detector.`
  else if (unchanged) status = 'This is the difference plate on screen now.'
  else status = `Press Show to compare ${passes[from].label} with ${passes[to].label} in ${band}.`

  const shown = { from: passes[comparison.from], to: passes[comparison.to] }

  return (
    <>
      <section className="difference panel" aria-labelledby="difference-heading">
        <h2 id="difference-heading" className="panel-heading">
          Difference Plate
        </h2>
        <p className="panel-intro">
          A later pass minus an earlier one. Whatever stayed the same disappears; only what changed
          is left.
        </p>

        <fieldset className="difference__group">
          <legend className="label">Compare two passes</legend>
          <div className="difference__options">
            {passes.map((p, i) => {
              const on = picked.includes(i)
              return (
                <button
                  key={p.id}
                  type="button"
                  className="difference__pass"
                  aria-pressed={on}
                  disabled={!on && picked.length >= 2}
                  onClick={() => togglePass(i)}
                >
                  <span className="difference__pass-label">{p.label}</span>
                  <span className="difference__pass-date">{formatDate(p.date)}</span>
                </button>
              )
            })}
          </div>
          {picked.length >= 2 && passes.length > 2 && (
            <p className="difference__hint">Unselect one to pick another.</p>
          )}
        </fieldset>

        <fieldset className="difference__group">
          <legend className="label">Detector</legend>
          <div className="difference__options difference__options--row">
            {bands.map((b) => (
              <button
                key={b}
                type="button"
                className="difference__band"
                aria-pressed={band === b}
                onClick={() => setBand(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="difference__status" aria-live="polite">
          {status}
        </p>
        <button
          type="button"
          className="difference__show"
          disabled={!valid || unchanged}
          onClick={() => onShow({ from, to, band })}
        >
          Show difference
        </button>

        <p className="difference__now">
          On the plate: {shown.from?.label} → {shown.to?.label}, {comparison.band}
          <span className="data">
            {shown.from && formatDate(shown.from.date)} to {shown.to && formatDate(shown.to.date)}
          </span>
        </p>
      </section>

      <section className="difference-key panel" aria-labelledby="difference-key-heading">
        <h2 id="difference-key-heading" className="panel-heading">
          How to read this
        </h2>
        <ul className="difference-key__list">
          {LEGEND.map((row) => (
            <li key={row.swatch} className="difference-key__row">
              <span
                className={`difference-key__swatch difference-key__swatch--${row.swatch}`}
                aria-hidden="true"
              />
              <p>
                <strong>{row.name}:</strong> {row.text}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
