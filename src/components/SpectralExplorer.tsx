import { LruCache } from '../utils/lru'
import { measureTarget } from '../utils/performance'
import { loadExtraction } from '../api/science'
import type { Extraction } from '../api/science'
import ScientificMap from './ScientificMap'
import { useEffect, useState } from 'react'
import type { Target } from '../api/types'
import './SpectralExplorer.css'

const readyCache = new LruCache<string, Extraction>(16)
export default function SpectralExplorer({ target }: { target: Target }) {
  const [redshift, setRedshift] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const key = `${target.id}/${redshift}`
  const [state, setState] = useState<{
    key: string
    result: Extraction | null
    status: string
    error: string
  }>(() => ({
    key,
    result: readyCache.get(key) ?? null,
    status: readyCache.has(key) ? 'ready' : 'loading',
    error: '',
  }))
  const current =
    state.key === key
      ? state
      : {
          key,
          result: readyCache.get(key) ?? null,
          status: readyCache.has(key) ? 'ready' : 'loading',
          error: '',
        }
  const { result, status, error } = current
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let manifestUrl = ''
    const poll = async (retry = false) => {
      try {
        const query = new URLSearchParams({
          target: target.id,
          radius: '30',
          z: String(redshift),
          ...(retry ? { retry: '1' } : {}),
        })
        const response = await fetch(`/science/extract?${query}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Chemistry data could not be loaded. Please retry.')
        const data = await response.json()
        if (controller.signal.aborted) return
        if (data.status === 'error') throw new Error(data.error)
        if (data.resultUrl && manifestUrl !== data.resultUrl) {
          const result = await loadExtraction(data.resultUrl)
          if (controller.signal.aborted) return
          manifestUrl = data.resultUrl
          measureTarget(target.id, 'chemistry-ready')
          if (result.medianValues) measureTarget(target.id, 'median-ready')
          if (result.galex) measureTarget(target.id, 'galex-ready')
          if (data.status === 'ready') readyCache.set(key, result)
          setState({ key, result, status: data.status, error: '' })
        } else if (data.status === 'ready') {
          setState((previous) => {
            if (previous.key === key && previous.result) readyCache.set(key, previous.result)
            return previous.key === key ? { ...previous, status: 'ready' } : previous
          })
        }
        if (data.status !== 'ready')
          timer = setTimeout(() => {
            void poll()
          }, 1000)
      } catch (e) {
        if (!controller.signal.aborted)
          setState((previous) => ({
            key,
            result: previous.key === key ? previous.result : null,
            status: 'error',
            error: e instanceof Error ? e.message : 'Loading failed',
          }))
      }
    }
    // Load on selection; briefly debounce redshift edits to avoid redundant jobs.
    timer = setTimeout(
      () => {
        void poll(attempt > 0)
      },
      redshift === 0 ? 0 : 300,
    )
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [target.id, redshift, key, attempt])
  return (
    <section className="spectral-explorer" aria-label="Molecular maps">
      <p className="label">SPHEREx × GALEX</p>
      <h2>Carbon particles & interstellar ice</h2>
      <p>
        Map PAH emission and ice absorption across the same 0.1° sky field as the main image of{' '}
        {target.name}: north up, east left. Each map measures a specific wavelength feature relative
        to its nearby continuum, rather than recolouring the main image.
      </p>
      <div className="spectral-controls">
        <label>
          Source redshift
          <input
            type="number"
            min="0"
            max="0.02"
            step="0.00001"
            value={redshift}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n) && n >= 0 && n <= 0.02) setRedshift(n)
            }}
          />
        </label>
      </div>
      <p className="spectral-note">
        Quick look · HiPS mosaics combine observation times. Feature maps are exploratory
        indicators, not confirmed detections or abundances.
      </p>
      {status === 'loading' && !result && (
        <p role="status">
          Loading chemistry maps automatically… First-time fields load the required IRSA sky
          subsets; cached fields load immediately.
        </p>
      )}
      {status === 'error' && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setState({ key, result, status: 'loading', error: '' })
              setAttempt((n) => n + 1)
            }}
          >
            Retry loading
          </button>
        </div>
      )}
      {result && (
        <>
          <div className="spectral-map--median">
            {result.medianValues ? (
              <ScientificMap
                values={result.medianValues}
                width={result.width}
                height={result.height}
                label="Median cube image · aperture & background"
                unit="MJy/sr"
                logarithmic
                apertureArcsec={result.apertureArcsec}
                annulusArcsec={result.annulusArcsec}
                fieldSizeDeg={result.fieldSizeDeg}
              />
            ) : (
              <p role="status">
                Chemistry maps are ready. Loading the remaining channels for the median image…
              </p>
            )}
            <p>
              Median across wavelength channels · logarithmic scale · 5th–99.9th percentile of
              positive pixels. Aperture {result.apertureArcsec}″; background annulus{' '}
              {result.annulusArcsec.join('–')}″.
            </p>
          </div>
          <div className="spectral-maps">
            {result.maps.map((feature) => (
              <article key={feature.id}>
                <ScientificMap
                  values={feature.values}
                  width={result.width}
                  height={result.height}
                  label={`${feature.name} · ${feature.wave.toFixed(2)} μm`}
                  unit={feature.unit}
                />
                <p>
                  Sampled channel: {feature.observed.toFixed(3)} μm. Continuum:{' '}
                  {feature.continuum.map((w) => w.toFixed(3)).join(', ')} μm.
                </p>
              </article>
            ))}
          </div>
          <p>
            Chemistry maps: linear inferno scale, 5th–99.5th percentile. PAH: channel brightness
            minus interpolated continuum. Ice: −ln(channel / continuum); negative values remain
            visible. Ice depths require positive background continuum and may include blended
            features.
          </p>
          <h3>GALEX FUV · the ultraviolet environment</h3>
          <p>
            PAH 3.3 μm traces emission from small carbon-based particles. GALEX FUV traces UV light
            from hot stars and provides context for their illumination and destruction.
          </p>
          {result.galex ? (
            <>
              <div className="spectral-map--galex">
                <ScientificMap
                  values={result.galex.values}
                  width={result.width}
                  height={result.height}
                  label="GALEX FUV with PAH contours"
                  unit={result.galex.unit || 'native survey intensity'}
                  galex
                  pah={result.maps.find((feature) => feature.id === 'pah')?.values}
                />
              </div>
              <p>
                GALEX: linear Blues scale, 5th–99.5th percentile. Red PAH contours: 0.3, 0.4 and 0.5
                MJy/sr excess where the data reach those levels. Surveys have different epochs and
                PSFs.
              </p>
            </>
          ) : result.galexPending ? (
            <p role="status">Chemistry maps are ready. Loading the matching GALEX FUV field…</p>
          ) : (
            <p>No usable GALEX FUV image: {result.galexError}. SPHEREx results remain available.</p>
          )}
          <p className="spectral-note">
            SPHEREx DR1 HiPS · 102 channels · nearest-pixel sky sampling · conservative quality
            mask. Mosaics may contain striping; no uncertainty or PSF fit is applied.
          </p>
        </>
      )}
    </section>
  )
}
