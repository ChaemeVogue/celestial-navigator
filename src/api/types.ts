// Data contract shared with the Django backend (plan.md section 4).
// Mocks in ./mock must match these shapes exactly.
//
// Backend source: IRSA TAP, tables spherex.artifact + spherex.plane, queried per
// target and per bandpass. pipeline/ turns those FITS cutouts into these shapes
// today; docs/backend-notes.md explains how the backend should do the same.

export type Target = {
  id: string // "m101"
  messier: string // "M101"
  name: string // "Pinwheel Galaxy"
  kind: string // "face-on spiral galaxy"
  ra: number // decimal degrees, ICRS
  dec: number // decimal degrees, ICRS
}

export type Pass = {
  id: string // "m101-pass-1"
  label: string // "Pass I", or "Short visit"
  date: string // ISO 8601: the visit's mean observation time, from time_bounds_lower (MJD)
  imageUrl: string // processed, browser-ready image (square PNG/WebP)
  // Each detector alone as a greyscale image, keyed by ColourKeyEntry.band ("D1").
  // A band is missing when the visit has no images in it. Omitted for simulated targets.
  bandImageUrls?: Record<string, string>
  // A brief revisit (about a day, few images, sometimes missing a band) between full passes.
  short?: boolean
}

export type Candidate = {
  id: string // "SX-001"
  // position in image space, as a 0–100 percentage of width/height, for each pass
  positions: { passId: string; x: number; y: number }[]
  note: string
  status: 'candidate' | 'confirmed' | 'unreviewed'
}

export type PassesResponse = {
  targetId: string
  fieldSizeDeg: number // width of the square image on the sky (0.1)
  passes: Pass[] // sorted oldest → newest
  candidates: Candidate[]
  // Mock data only: placeholder images, not real SPHEREx data. The backend never sets this.
  simulated?: boolean
}

export type ColourKeyEntry = {
  band: string // detector id, "D1"; matches the keys of Pass.bandImageUrls
  colour: string // hex
  label: string // "Shortest band (D1)"
  wavelength: string // "~0.9 µm": median wavelength at the target across that detector's images
}
