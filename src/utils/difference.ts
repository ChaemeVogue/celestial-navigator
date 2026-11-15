// Difference plates: a later pass minus an earlier one, in one detector, made in the browser
// from the greyscale single-detector images (Pass.bandImageUrls). Those share one brightness
// scale across all passes of a target, so anything that stayed the same cancels out.
//
// Colours match pipeline/process.py: amber where the earlier pass was brighter (where
// something was), blue where the later pass is brighter (where it is now), black elsewhere.

const GAIN = 2.5 // how strongly a change shows: a 40% change in brightness is full colour

const clamp = (n: number) => Math.min(1, Math.max(0, n))

// RGBA pixels (as from a canvas) of the earlier and later images → RGBA difference pixels.
// Only the red channel is read: the inputs are greyscale.
export function differencePixels(
  earlier: Uint8ClampedArray,
  later: Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(earlier.length))
  for (let i = 0; i < earlier.length; i += 4) {
    const d = (later[i] - earlier[i]) / 255
    const was = clamp(-d * GAIN) // brighter before
    const now = clamp(d * GAIN) // brighter after
    out[i] = 255 * clamp(was + now * 0.35)
    out[i + 1] = 255 * clamp(clamp(-d * 1.7) * 0.69 + now * 0.63)
    out[i + 2] = 255 * now
    out[i + 3] = 255
  }
  return out
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // the backend may be on another host; it allows this
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't load ${url}`))
    img.src = url
  })
}

function pixelsOf(img: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height).data
}

// The difference plate as a PNG data URL, ready for an <img>.
export async function makeDifferenceImage(earlierUrl: string, laterUrl: string): Promise<string> {
  const [a, b] = await Promise.all([loadImage(earlierUrl), loadImage(laterUrl)])
  const width = a.naturalWidth
  const height = a.naturalHeight
  const pixels = differencePixels(pixelsOf(a, width, height), pixelsOf(b, width, height))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}
