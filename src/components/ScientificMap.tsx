import type { PixelValues } from '../utils/pixels'
import { plotLimits, probePixel } from '../utils/plotLimits'
import { useEffect, useMemo, useRef, useState } from 'react'
import { contours } from 'd3-contour'
import { interpolateInferno, interpolateBlues } from 'd3-scale-chromatic'

const LEFT = 66,
  TOP = 30,
  SIDE = 450,
  SIZE = 600

type Props = {
  values: PixelValues
  width: number
  height: number
  label: string
  unit: string
  logarithmic?: boolean
  apertureArcsec?: number
  fieldSizeDeg?: number
  annulusArcsec?: number[]
  pah?: PixelValues
  galex?: boolean
}
export default function ScientificMap({
  values,
  width,
  height,
  label,
  unit,
  logarithmic = false,
  apertureArcsec,
  annulusArcsec,
  fieldSizeDeg = 0.1,
  pah,
  galex = false,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [pixelRatio, setPixelRatio] = useState(1)
  useEffect(() => {
    const show = () => {
      setVisible(true)
      setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    }
    if (!('IntersectionObserver' in window)) {
      show()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          show()
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    if (canvas.current) observer.observe(canvas.current)
    return () => observer.disconnect()
  }, [])
  const [probe, setProbe] = useState<number | null>(null)
  const limits = useMemo(() => plotLimits(values, logarithmic), [values, logarithmic])
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx || !visible) return
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.fillStyle = '#101c33'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.font = '14px system-ui'
    ctx.fillStyle = '#ede6d3'
    if (!limits) {
      ctx.fillText('No usable pixels in this field', LEFT, SIDE / 2)
      return
    }
    const [lo, hi] = limits
    const normalise = (v: number) =>
      Math.max(
        0,
        Math.min(1, logarithmic ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo)),
      )
    const colour = galex ? interpolateBlues : interpolateInferno
    const image = document.createElement('canvas')
    image.width = width
    image.height = height
    const pixels = image.getContext('2d')!
    values.forEach((value, i) => {
      pixels.fillStyle =
        value === null || !Number.isFinite(value) || (logarithmic && value <= 0)
          ? '#303645'
          : colour(normalise(value))
      pixels.fillRect(i % width, Math.floor(i / width), 1, 1)
    })
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, LEFT, TOP, SIDE, SIDE)
    const drawContours = (
      x: number,
      y: number,
      sideX: number,
      sideY: number,
      crop = [0, 0, width, height],
    ) => {
      if (!pah) return
      const finite = pah.filter((v): v is number => v !== null)
      const levels = [0.3, 0.4, 0.5].filter(
        (v) => finite.some((n) => n > v) && finite.some((n) => n < v),
      )
      const lines = contours().size([width, height]).thresholds(levels)(
        Array.from(pah, (v) => (v !== null && Number.isFinite(v) ? v : -Infinity)),
      )
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, sideX, sideY)
      ctx.clip()
      ctx.strokeStyle = '#ff2020'
      ctx.lineWidth = crop[2] === width ? 0.8 : 1.2
      for (const line of lines) {
        ctx.beginPath()
        for (const polygon of line.coordinates)
          for (const ring of polygon) {
            ring.forEach(([px, py], i) => {
              const dx = x + ((px - crop[0]) / crop[2]) * sideX,
                dy = y + ((py - crop[1]) / crop[3]) * sideY
              if (i === 0) ctx.moveTo(dx, dy)
              else ctx.lineTo(dx, dy)
            })
            ctx.closePath()
          }
        ctx.stroke()
      }
      ctx.restore()
    }
    drawContours(LEFT, TOP, SIDE, SIDE)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.strokeRect(LEFT, TOP, SIDE, SIDE)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ede6d3'
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((i / 4) * (width - 1)),
        x = LEFT + ((value + 0.5) / width) * SIDE
      ctx.beginPath()
      ctx.moveTo(x, TOP + SIDE)
      ctx.lineTo(x, TOP + SIDE + 5)
      ctx.stroke()
      ctx.fillText(String(value), x, TOP + SIDE + 24)
      const v = Math.round((i / 4) * (height - 1)),
        y = TOP + SIDE - ((v + 0.5) / height) * SIDE
      ctx.beginPath()
      ctx.moveTo(LEFT - 5, y)
      ctx.lineTo(LEFT, y)
      ctx.stroke()
      ctx.textAlign = 'right'
      ctx.fillText(String(v), LEFT - 10, y + 5)
      ctx.textAlign = 'center'
    }
    ctx.fillText('x [px]', LEFT + SIDE / 2, TOP + SIDE + 52)
    ctx.save()
    ctx.translate(20, TOP + SIDE / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('y [px]', 0, 0)
    ctx.restore()
    for (let y = 0; y < SIDE; y++) {
      ctx.fillStyle = colour(1 - y / SIDE)
      ctx.fillRect(LEFT + SIDE + 16, TOP + y, 14, 1)
    }
    ctx.font = '11px system-ui'
    ctx.fillStyle = '#ede6d3'
    ctx.textAlign = 'left'
    for (let i = 0; i <= 4; i++) {
      const fraction = i / 4
      const v = logarithmic ? lo * (hi / lo) ** fraction : lo + fraction * (hi - lo)
      ctx.fillText(v.toPrecision(2), LEFT + SIDE + 34, TOP + SIDE * (1 - fraction) + 4)
    }
    ctx.textAlign = 'center'
    ctx.fillText(unit, LEFT + SIDE / 2, 570)
    if (apertureArcsec && annulusArcsec) {
      const cx = LEFT + SIDE / 2,
        cy = TOP + SIDE / 2,
        perArcsec = SIDE / (fieldSizeDeg * 3600)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx - 6, cy)
      ctx.lineTo(cx + 6, cy)
      ctx.moveTo(cx, cy - 6)
      ctx.lineTo(cx, cy + 6)
      ctx.stroke()
      for (const [i, radius] of [apertureArcsec, ...annulusArcsec].entries()) {
        ctx.setLineDash(i ? [2, 3] : [])
        ctx.beginPath()
        ctx.arc(cx, cy, radius * perArcsec, 0, 2 * Math.PI)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.fillStyle = '#000'
      ctx.fillRect(LEFT + SIDE - 145, TOP + SIDE - 55, 140, 50)
      ctx.fillStyle = '#fff'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText('— Aperture', LEFT + SIDE - 135, TOP + SIDE - 34)
      ctx.fillText('⋯ Background', LEFT + SIDE - 135, TOP + SIDE - 14)
    }
  }, [
    visible,
    pixelRatio,
    values,
    width,
    height,
    limits,
    logarithmic,
    galex,
    pah,
    apertureArcsec,
    annulusArcsec,
    fieldSizeDeg,
    unit,
  ])
  return (
    <figure className="spectral-map">
      <figcaption>{label}</figcaption>
      <canvas
        ref={canvas}
        width={SIZE * pixelRatio}
        height={SIZE * pixelRatio}
        aria-label={`${label}, pixel axes and ${logarithmic ? 'logarithmic' : 'linear'} ${galex ? 'Blues' : 'inferno'} colour scale`}
        onPointerMove={(event) => {
          const r = event.currentTarget.getBoundingClientRect()
          const x = ((event.clientX - r.left) / r.width) * SIZE,
            y = ((event.clientY - r.top) / r.height) * SIZE
          setProbe(probePixel((x - LEFT) / SIDE, (y - TOP) / SIDE, width, height))
        }}
      />
      <output>
        {probe === null
          ? 'Point at the map to inspect pixel values.'
          : `x ${probe % width}, y ${height - 1 - Math.floor(probe / width)} · ${values[probe] !== null && Number.isFinite(values[probe]) ? values[probe]!.toPrecision(4) : 'masked'} ${unit}`}
      </output>
    </figure>
  )
}
