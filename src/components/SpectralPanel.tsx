import type { SpectralMap } from '../hooks/useSpectralMap'
import { spectralColour } from '../utils/spectral'
import { SPECTRAL_LAYERS, layerById } from '../utils/spectralLayers'
import type { SpectralLayerId } from '../utils/spectralLayers'
import './SpectralPanel.css'

type Props = {
  map: SpectralMap
  layer: SpectralLayerId
  onLayerChange: (layer: SpectralLayerId) => void
  onRetry: () => void
}

// The legend's gradient, in the map's own colours (dark = faint, light = bright)
const GRADIENT = `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) =>
  spectralColour(i / 8),
).join(', ')})`

function Status({ map, onRetry }: Pick<Props, 'map' | 'onRetry'>) {
  if (map.status === 'loading') {
    return (
      <p className="spectral__status" role="status">
        Building the spectral map from SPHEREx’s all-sky cube… The first time for a target takes
        about half a minute; after that it’s instant.
      </p>
    )
  }
  if (map.status === 'offline') {
    return (
      <div className="spectral__problem" role="alert">
        {import.meta.env.DEV ? (
          <p>
            The science service isn’t running, so spectral maps can’t be made. To start it, run{' '}
            <code>.venv-science/bin/python science/server.py</code> in the project folder.
          </p>
        ) : (
          <p>
            Spectral maps need Celestial Navigator’s science service, which isn’t connected to this
            site. Blink and Difference work without it.
          </p>
        )}
        <button type="button" className="spectral__retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  if (map.status === 'error') {
    return (
      <div className="spectral__problem" role="alert">
        <p>{map.message}</p>
        <button type="button" className="spectral__retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  return null
}

// The side panel in the Spectral view: All light, or one of the molecule maps (carbon particles,
// water, CO₂ and CO ice). They all arrive together, so switching is instant.
export default function SpectralPanel({ map, layer, onLayerChange, onRetry }: Props) {
  const current = layerById(layer)
  const has = (id: SpectralLayerId) => map.status !== 'ready' || Boolean(map.images[id])
  return (
    <section className="spectral panel" aria-labelledby="spectral-heading">
      <h2 id="spectral-heading" className="panel-heading">
        Spectral Map
      </h2>
      <p className="panel-intro">
        SPHEREx photographs the sky in 102 colours of infrared light. These maps come from its
        all-sky cube, which stacks every visit together.
      </p>

      <div className="spectral__group">
        <p className="label" id="spectral-map-label">
          Show
        </p>
        <div className="spectral__options" role="group" aria-labelledby="spectral-map-label">
          {SPECTRAL_LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              className="spectral__option"
              aria-pressed={layer === l.id}
              disabled={!has(l.id)}
              title={has(l.id) ? undefined : 'No usable pixels for this map here'}
              onClick={() => onLayerChange(l.id)}
            >
              {l.button}
            </button>
          ))}
        </div>
        <p className="spectral__hint">
          {current.wavelength && <strong>{current.wavelength}. </strong>}
          {current.explain}
        </p>
      </div>

      <Status map={map} onRetry={onRetry} />

      <div className="spectral__legend">
        <p className="label">{current.id === 'all' ? 'Brightness' : current.title}</p>
        <span className="spectral__gradient" style={{ background: GRADIENT }} aria-hidden="true" />
        <p className="spectral__scale">
          <span>{current.low}</span>
          <span>{current.high}</span>
        </p>
        <p className="spectral__hint">
          {current.logarithmic
            ? 'A logarithmic scale, so faint glow and bright stars both show.'
            : 'Scaled to this field: the faintest 5% and brightest 0.5% are clipped.'}{' '}
          Grey means no data.
        </p>
      </div>

      <div className="spectral__note">
        <h3 className="label">Good to know</h3>
        {current.id === 'all' ? (
          <p>
            Because every visit is stacked together, nothing moves here: use Blink and Difference to
            hunt for movers. The map is 64 pixels across, so it’s softer than the plates.
          </p>
        ) : (
          <p>
            Water, carbon and these ices are raw ingredients of planets, and of life as we know it.
            These maps are exploratory hints, not confirmed detections: dust, starlight and stripes
            in the data can look similar. Cold, dusty clouds where stars are forming are the most
            likely places to see them.
          </p>
        )}
      </div>
    </section>
  )
}
