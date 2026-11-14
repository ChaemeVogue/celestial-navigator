import type { ColourKeyEntry } from '../api/types'
import './ColourKeyPanel.css'

type Props = {
  entries: ColourKeyEntry[]
  band: string | null // null = colour composite
  bandsAvailable: boolean // false for simulated targets, which only have colour images
  onBandChange: (band: string | null) => void
}

export default function ColourKeyPanel({ entries, band, bandsAvailable, onBandChange }: Props) {
  const options = [
    { id: null, label: 'Colour' },
    ...entries.map((e) => ({ id: e.band, label: e.band })),
  ]

  return (
    <section id="colours" className="colour-key panel" aria-labelledby="colour-key-heading">
      <h2 id="colour-key-heading" className="panel-heading">
        Colour Key
      </h2>
      <p className="panel-intro">
        Each visible colour stands in for an infrared wavelength SPHEREx measured.
      </p>

      {entries.length > 0 && (
        <div className="colour-key__switcher">
          <p className="label" id="band-switcher-label">
            Show
          </p>
          <div className="colour-key__options" role="group" aria-labelledby="band-switcher-label">
            {options.map((o) => (
              <button
                key={o.label}
                type="button"
                className="colour-key__option"
                aria-pressed={band === o.id}
                disabled={!bandsAvailable && o.id !== null}
                onClick={() => onBandChange(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="colour-key__hint">
            {bandsAvailable
              ? 'See what each detector recorded on its own. Different things glow at different wavelengths.'
              : 'Single detectors are only available for real SPHEREx targets.'}
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="colour-key__list">
          {entries.map((entry) => (
            <li
              key={entry.colour}
              className={`colour-key__row${band === entry.band ? ' colour-key__row--active' : ''}`}
            >
              <span
                className="colour-key__dot"
                style={{ background: entry.colour }}
                aria-hidden="true"
              />
              <span className="colour-key__label">{entry.label}</span>
              <span className="colour-key__wavelength data">{entry.wavelength}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="colour-key__note">
        <h3 className="label">Why false colour?</h3>
        <p>
          SPHEREx sees infrared light, which human eyes can’t, so each band is shown as a colour we
          can see. A spot that looks amber is brightest at the longest wavelengths, often warm dust.
        </p>
      </div>
    </section>
  )
}
