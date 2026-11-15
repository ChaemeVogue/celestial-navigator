import { decodePixels } from '../utils/pixels'
import type { PixelValues } from '../utils/pixels'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PassesResponse, Target } from '../api/types'
import { difference } from '../utils/comparison'
import './ImageComparison.css'

type Plane = { width: number; height: number; values: PixelValues; unit: string }
async function loadPlane(url: string, scientific: boolean): Promise<Plane> {
  if (scientific) {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Could not load calibrated pixels.')
    if (/\.bin(?:$|\?)/.test(url)) {
      const buffer = await response.arrayBuffer(),
        values = decodePixels(buffer),
        header = new DataView(buffer)
      return {
        width: header.getUint32(8, true),
        height: header.getUint32(12, true),
        values,
        unit: 'MJy/sr',
      }
    }
    const plane: Plane = await response.json()
    if (
      !Number.isInteger(plane.width) ||
      plane.width < 1 ||
      !Number.isInteger(plane.height) ||
      plane.height < 1 ||
      plane.values.length !== plane.width * plane.height ||
      plane.unit !== 'MJy/sr'
    )
      throw new Error('Invalid calibrated pixel plane.')
    return plane
  }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  return {
    width: canvas.width,
    height: canvas.height,
    unit: 'display DN (0–255)',
    values: Array.from({ length: canvas.width * canvas.height }, (_, i) =>
      pixels[i * 4 + 3] ? pixels[i * 4] : null,
    ),
  }
}

export default function ImageComparison({
  data,
  target,
}: {
  data: PassesResponse
  target: Target
}) {
  const options = useMemo(
    () =>
      data.passes.flatMap((p) =>
        Object.entries(p.bandImageUrls ?? {}).map(([band, url]) => ({
          key: `${p.id}/${band}`,
          label: `${p.label} · ${p.date.slice(0, 10)} · ${band}`,
          url,
          science: p.bandPixelUrls?.[band],
          band,
        })),
      ),
    [data.passes],
  )
  const [aKey, setA] = useState(options[0]?.key ?? '')
  const [bKey, setB] = useState(
    options.find((o) => o.band === options[0]?.band && o.key !== options[0]?.key)?.key ??
      options[0]?.key ??
      '',
  )
  const [planes, setPlanes] = useState<[Plane, Plane] | null>(null)
  const [error, setError] = useState('')
  const [probe, setProbe] = useState<number | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const a = options.find((o) => o.key === aKey),
    b = options.find((o) => o.key === bKey)
  const scientific = Boolean(a?.science && b?.science)
  useEffect(() => {
    let cancelled = false
    if (a && b)
      Promise.all([
        loadPlane(scientific ? a.science! : a.url, scientific),
        loadPlane(scientific ? b.science! : b.url, scientific),
      ])
        .then(([pa, pb]) => {
          if (pa.width !== pb.width || pa.height !== pb.height || pa.unit !== pb.unit)
            throw new Error('Images must share a grid and units; resampling is required.')
          if (!cancelled) setPlanes([pa, pb])
        })
        .catch((e) => {
          if (!cancelled) setError(e.message)
        })
    return () => {
      cancelled = true
    }
  }, [a, b, scientific])
  const delta = useMemo(
    () => (planes ? difference(planes[0].values, planes[1].values) : []),
    [planes],
  )
  const valid = delta.filter((v): v is number => v !== null)
  const scale = valid.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
  useEffect(() => {
    if (!planes || !canvas.current) return
    const [pa] = planes
    const ctx = canvas.current.getContext('2d')!
    const pixels = ctx.createImageData(pa.width, pa.height)
    delta.forEach((d, i) => {
      const offset = i * 4
      if (d === null) {
        pixels.data.set([45, 45, 52, 255], offset)
        return
      }
      const v = (Math.abs(d) / scale) * 255
      pixels.data.set(d >= 0 ? [v * 0.35, v * 0.7, v, 255] : [v, v * 0.65, v * 0.18, 255], offset)
    })
    ctx.putImageData(pixels, 0, 0)
  }, [planes, scale, delta])
  if (!options.length)
    return (
      <section className="comparison">
        <h2>Image comparison</h2>
        <p>
          Single-detector images are unavailable for this target. Select a target with real SPHEREx
          visits to compare pixels.
        </p>
      </section>
    )
  return (
    <section className="comparison" aria-label="Image comparison">
      <h2>Overlap & pixel differences</h2>
      <p>
        Shared field centre · ICRS RA {target.ra.toFixed(5)}° · Dec {target.dec.toFixed(5)}° ·{' '}
        {data.fieldSizeDeg}° field · north up, east left
      </p>
      <div className="comparison__controls">
        <label>
          Reference A
          <select
            value={aKey}
            onChange={(e) => {
              setPlanes(null)
              setError('')
              setProbe(null)
              setA(e.target.value)
            }}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comparison B
          <select
            value={bKey}
            onChange={(e) => {
              setPlanes(null)
              setError('')
              setProbe(null)
              setB(e.target.value)
            }}
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {scientific
          ? 'Unstretched, background-subtracted pixels · MJy/sr'
          : 'Quick-look comparison · stretched PNG display values, not calibrated flux.'}{' '}
        {a?.band !== b?.band &&
          'Different detectors: spectral differences cannot establish temporal variability.'}
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !planes ? (
        <p role="status">Loading aligned pixels…</p>
      ) : (
        <>
          <canvas
            ref={canvas}
            width={planes[0].width}
            height={planes[0].height}
            className="comparison__canvas"
            aria-label="Aligned pixel comparison"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const x = Math.min(
                planes[0].width - 1,
                Math.floor(((e.clientX - r.left) / r.width) * planes[0].width),
              )
              const y = Math.min(
                planes[0].height - 1,
                Math.floor(((e.clientY - r.top) / r.height) * planes[0].height),
              )
              setProbe(y * planes[0].width + x)
            }}
          />
          <p>
            Amber: B &lt; A · black: unchanged · blue: B &gt; A · grey: no shared data. Difference
            scale ±{scale.toFixed(3)} {planes[0].unit}.
          </p>
          <output aria-live="polite">
            {probe === null
              ? 'Point at the image to inspect a pixel.'
              : `Pixel (${probe % planes[0].width}, ${Math.floor(probe / planes[0].width)}) · A: ${Number.isFinite(planes[0].values[probe]) ? planes[0].values[probe]!.toFixed(3) : 'masked'} · B: ${Number.isFinite(planes[1].values[probe]) ? planes[1].values[probe]!.toFixed(3) : 'masked'} · B − A: ${delta[probe]?.toFixed(3) ?? 'masked'} ${planes[0].unit}`}
          </output>
          <p>
            {valid.length} shared pixels · mean Δ{' '}
            {valid.length ? (valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(3) : '—'} ·
            RMS Δ{' '}
            {valid.length
              ? Math.sqrt(valid.reduce((s, v) => s + v * v, 0) / valid.length).toFixed(3)
              : '—'}
          </p>
        </>
      )}
    </section>
  )
}
