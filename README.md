# Celestial Navigator

A blink comparator for the NASA "Planet X and SPHEREx" hackathon challenge. Pick a target
on a sky chart, then step or play through every SPHEREx pass over that spot and look for
anything that moves. It's the modern version of the comparator Clyde Tombaugh used to
find Pluto in 1930.

**Live preview of the real data:** https://claude.ai/artifact/2TJEFE59zmsWqwEuHHUH75
(a one-page report built by `pipeline/build_report.py`, shared by link).

## Status at a glance

| Part               | State                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Front end (`src/`) | Working MVP: sky chart picker, sky plate, timeline with play, band switcher, observation log                                     |
| Real SPHEREx data  | M101, M104, M45, M1, M16, made by `pipeline/` and served as mock JSON                                                            |
| Simulated targets  | M31, M42, M51: placeholder images, marked "Simulated" in the app                                                                 |
| Django backend     | Not started in this repo. The contract is in `src/api/types.ts`; the how-to is in [docs/backend-notes.md](docs/backend-notes.md) |
| Mover detection    | Not built. Real targets show "No movers flagged here yet"                                                                        |

The saved working version is tagged **`v0.1-mvp`**. Try new ideas on a branch (see
[Working on it](#working-on-it)).

## What a user can do

- **Pick a target** from the dropdown or by clicking a star on the whole-sky chart. The
  chart shows the ecliptic (where planets and asteroids travel) and the Milky Way.
- **Blink the passes.** Each pass is SPHEREx's look at that spot, about six months apart.
  Step with ◀ ▶, the arrow keys, or press Play.
- **Switch bands.** Show the colour image or one infrared detector alone (D1 ~0.9 µm,
  D3 ~2.0 µm, D6 ~4.7 µm). Try D1 then D6 on M16: the Pillars of Creation appear.
- **Read the readouts:** RA/Dec, distance from the ecliptic, passes on file.

## Quick start

Needs Node 20.19 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. It runs entirely on the data in `src/api/mock/`, no backend
needed.

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | dev server                                   |
| `npm test`       | unit tests (Vitest)                          |
| `npm run build`  | type-check and production build into `dist/` |
| `npm run lint`   | oxlint                                       |
| `npm run format` | Prettier                                     |
| `npm run mocks`  | regenerate the simulated placeholder SVGs    |

To process real SPHEREx data you also need Python 3.9+; see
[pipeline/README.md](pipeline/README.md).

## How it fits together

```
IRSA archive (NASA/IPAC)
   │  ADQL query + FITS cutouts, ~4 MB each, ~170 per target
   ▼
pipeline/  (Python)          group into passes → align north-up → combine → stretch → PNG
   │  writes public/mock/images/<id>/*.png and src/api/mock/passes/<id>.json
   ▼
src/api/client.ts            VITE_USE_MOCKS=true  → reads src/api/mock/
   │                         VITE_USE_MOCKS=false → GET /api/... from Django
   ▼
src/hooks/useExplorer.ts     all app state
   ▼
src/components/              what you see
```

The backend's job is to replace the middle step: do what `pipeline/` does ahead of time
and serve the same JSON shapes. Nothing in the front end changes except `.env`.

### The data contract

Defined in [`src/api/types.ts`](src/api/types.ts), with real examples in `src/api/mock/`.

```
GET /api/targets              -> Target[]          id, messier, name, kind, ra, dec
GET /api/targets/:id/passes   -> PassesResponse    passes[] (label, date, imageUrl,
                                                   bandImageUrls, short), candidates[]
GET /api/colour-key           -> ColourKeyEntry[]  band, colour, label, wavelength
```

If you change the contract, update `types.ts`, the mock JSON, `pipeline/to_app.py` and
`docs/backend-notes.md` together.

## Code tour

| File                                        | What it does                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/App.tsx`                               | page layout; works out the active band and preloads images                   |
| `src/hooks/useExplorer.ts`                  | the only state: targets, selection, passes, pass index, play loop, band      |
| `src/api/client.ts`                         | mock/real switch, fetch helpers, image URL resolving                         |
| `src/components/TargetBar.tsx`              | dropdown, readouts, and the `SkyChart`                                       |
| `src/components/SkyChart.tsx`               | whole-sky Hammer projection with ecliptic, Milky Way and clickable targets   |
| `src/components/SkyPlate.tsx`               | the image, overlays (grid, compass, scale bar, badges) and candidate markers |
| `src/components/TimelinePanel.tsx`          | pass list, ◀ Play ▶, arrow keys                                              |
| `src/components/ColourKeyPanel.tsx`         | band switcher and colour key                                                 |
| `src/components/PlateCaption.tsx`           | the caption and data line under the plate                                    |
| `src/components/ObservationLog.tsx`         | candidate table                                                              |
| `src/utils/sky.ts`, `coords.ts`, `bands.ts` | sky maths, coordinate formatting, band image lookup (all tested)             |
| `src/styles/tokens.css`                     | colours, fonts and spacing; change the look here first                       |
| `pipeline/`                                 | IRSA query → download → process → app files, plus the preview report         |

Conventions: strict TypeScript, plain CSS with tokens (no UI library), one CSS file per
component, Prettier and oxlint must pass, and pure logic goes in `src/utils/` with tests.

## Handoff notes

### For the backend

Start with [docs/backend-notes.md](docs/backend-notes.md). In short:

1. Wrap `pipeline/run.py` (or port its steps) in a Django management command that
   processes a target ahead of time and stores the PNGs under `MEDIA_ROOT`.
2. Serve the three endpoints above from stored results. **Never call IRSA during a page
   request**: the query takes up to a minute and some downloads fail every run.
3. Point the front end at it: `VITE_USE_MOCKS=false` in `.env`, Django on port 8000,
   restart `npm run dev`. The Vite proxy forwards `/api` and `/media`, so no CORS in dev.

### Decisions already made

- Detectors **D1, D3, D6**; colours blue / cream / amber (colour-blind friendly).
- Square 0.1° field, requested at **0.15°** so rotated corners stay filled.
- Passes split at gaps of more than 30 days; under 20 exposures or 3 days is a
  **short visit**.
- One stretch per target across all passes, so brightness doesn't flicker.

### Things that will trip you up

- **IRSA returns HTTP 503 on a few downloads most runs.** `run.py` retries; just rerun.
- **Raw data is big**: 0.6–0.8 GB per target. `pipeline/data/` is git-ignored.
- **Medians hide fast movers**, and plain difference images flag every bright star. See
  [docs/spherex-findings.md](docs/spherex-findings.md) before building mover detection.
- **Real images are 116 px across.** They look soft when enlarged; that's the true
  resolution, not a bug.

### What's next

- Design pass: landing page with the sky chart as an observatory dome, a short story
  section, less text (ideas in progress, to be tried on a branch).
- Flip through single exposures within a pass (where asteroids actually show up).
- Known-asteroid demo: cut out the sky where e.g. Vesta was, for a guaranteed mover.
- Process M31, M42 and M51 so every target is real.
- Finish the accessibility and responsive pass (`plan.md` task 10).

## Working on it

- `main` is always the working version. `v0.1-mvp` marks the first complete MVP.
- Try ideas on a branch: `git switch -c design-experiments`. Merge it if it works,
  delete it if it doesn't.
- Before committing: `npm test && npm run build && npm run lint`.

## More docs

- [docs/backend-notes.md](docs/backend-notes.md): building the backend, step by step
- [docs/spherex-findings.md](docs/spherex-findings.md): what the real data taught us
- [pipeline/README.md](pipeline/README.md): running the Python pipeline
- [plan.md](plan.md): the original front-end plan and task list
- `docs/reference/`: the IRSA notebook the query came from

### Aligned image comparison

The comparison panel independently selects reference A and comparison B across visits
and detectors, maps signed B − A residuals
(amber negative, blue positive). Hover to inspect A, B, and their difference. Empty
coverage is excluded from the mean and RMS. The scientific method and source references are documented below.

Existing PNG assets support **display-value quick looks only**: their per-detector
stretches and filled star cores prevent calibrated flux comparisons. Rerunning
`pipeline/process.py` and `pipeline/to_app.py` additionally exports aligned,
unstretched, ZODI-subtracted median planes as lossless binary arrays (`bandPixelUrls`).
Values are float64 MJy/sr, row-major with north at the top, with a separate validity
bitset. The client also accepts legacy JSON planes. Gzip sidecars are exported. Both selections
must have these planes before the viewer uses physical units. The pipeline applies
a conservative FLAGS mask and leaves holes unfilled in the scientific export.

These residuals have no propagated uncertainties or PSF matching. Detector stacks
span wavelength distributions: detector equality does not guarantee matched
spectral response. Quantitative temporal variability needs matched spectral WCS,
bandwidth and PSFs, calibrated backgrounds and propagated variance. Cross-detector
residuals describe spectral as well as temporal and instrumental differences.

### Spectra, PAH / ice maps, and GALEX FUV

The **Carbon particles & interstellar ice** panel automatically requests real
SPHEREx DR1 HiPS FITS cubes when a target is selected. No extract button is needed.
It renders plots directly with browser Canvas and D3 colour scales / contours;
Matplotlib is not used. Browser memory caches completed fields, the service caches
results on disk, and SPHEREx maps appear before an uncached GALEX download completes. Start its local service alongside Vite:

```sh
python3 -m venv .venv-science
.venv-science/bin/pip install -r science/requirements.txt
.venv-science/bin/python science/server.py
# In another terminal:
npm run dev
```

Vite forwards `/science` to `127.0.0.1:8001`. Production hosting needs an equivalent
service route; the static frontend alone cannot process FITS cubes. Downloads and
results are cached outside the repository in `../work/science-cache` by default
(override with `SCIENCE_CACHE`). A complete cube tile is approximately 306 MiB, but new fields now use HTTP range reads instead of downloading it. The cube
release is pinned to `hips_20261026`, following the IRSA HiPS tutorial; update and
revalidate this root and the cache version when switching data releases.

The service looks up nested order-5 HEALPix tiles for every output sky position,
uses the cube's celestial WCS, masks no-hit and conservatively flagged pixels,
and nearest-samples onto a shared north-up 0.1° TAN grid. It handles fields that
cross tile boundaries. SOURCE flags are retained; empty dichroic channels 50 and
51 stay masked. HiPS wavelength metadata assigns each of the 102 channels.
The median image displays a 30 arcsec aperture and a 60–90 arcsec background
annulus as a field illustration. The spectrum and CSV controls are removed.
The grid oversamples the native HiPS resolution; samples are correlated and no
uncertainties or extra spatial detail are inferred.

Feature maps use an interpolated continuum between the mean brightness in two
rest-frame sidebands. The nearest observed channel to λ_rest × (1 + z) is selected.
The UI reports the actual channel and continuum wavelengths. Default redshift is
zero and is editable; it is not automatically inferred for a galaxy.

| Feature | Centre (μm) | Left continuum (μm) | Right continuum (μm) | Output |
| --- | --- | --- | --- | --- |
| PAH | 3.30 | 3.10–3.22 | 3.38–3.58 | channel − continuum, MJy/sr |
| Water ice | 3.05 | 2.64–2.81 | 3.55–3.78 | −ln(channel / continuum) |
| CO₂ ice | 4.27 | 4.14–4.22 | 4.33–4.41 | −ln(channel / continuum) |
| CO ice | 4.67 | 4.53–4.61 | 4.73–4.81 | −ln(channel / continuum) |

These are exploratory continuum choices, not fitted molecular profiles or
abundance estimates. Ice maps require positive channel and continuum brightness;
negative optical depth is preserved. Blends, extinction, spectral resolution,
striping and PSF differences can affect the result. No uncertainty significance,
PSF matching or confirmed detection is claimed. The all-time HiPS cube does not
provide temporal feature maps. The spectrum and CSV controls are intentionally hidden; the median cube image shows the central aperture and background annulus instead.

GALEX FUV is queried from the IRSA Spitzer LVL collection, with CDS HiPS2FITS
GALEX GR6 AIS as a fallback. It is aligned via its returned WCS to the
same field, and remains in its native survey intensity units. The median image uses logarithmic inferno with positive-pixel 5th–99.9th percentile limits, centre cross, solid aperture circle and dotted background annulus. Chemistry maps use linear inferno with 5th–99.5th percentile limits and pixel axes. GALEX uses linear Blues at the same 5th–99.5th percentiles, with red PAH contours at 0.3, 0.4 and 0.5 MJy/sr excess. It is a
visual comparison, not a flux ratio or statistical correlation. Missing GALEX
coverage does not discard SPHEREx results. GALEX traces the UV environment;
SPHEREx PAH emission traces small carbonaceous particles.

References used for implementation:
- https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/
- https://caltech-ipac.github.io/irsa-tutorials/spherex-mosaic/

Scientific validation: `python -m unittest discover -s science -v`.

Raw cutout filenames use a SHA-256 identity of the canonical source URL and data
release / processing revision. Cutout coordinates and size remain part of the
identity. Existing numbered files are reused only through a matching prior
`cutouts.json` manifest; query row order is never used as file identity. Downloads
stream to atomic temporary files, with a per-file lock for duplicate query rows.
The bundled-data loader has no artificial loading delay.

### FITS subset loading

The chemistry service uses Astropy `section` with fsspec HTTP ranges. It reads
short contiguous native row strips intersecting the selected field, then samples
only the requested sky pixels. Feature and continuum channels load first (26
channels at zero redshift); their maps are published before the median completes.
The full-channel median still requires the other valid wavelength channels, but
only their field-sized row strips are read. IMAGE, NHITS and FLAGS are retained
and the quality mask is unchanged. Already downloaded full FITS files are reused.
There is no automatic full-download fallback for remote subset failures.

Native sampled subsets and complete aligned field cubes are cached in compressed
NPZ files. Aligned cubes are reusable across redshift changes. Source release, sky
grid and mask policy are included in the cache identity.

A live M101 test requested 12,713,984 bytes for its 26 chemistry channels versus a
320,909,760-byte full tile, approximately 96% less transfer. Remote samples matched
the local full FITS data exactly, including masked pixels. This measurement covers
the chemistry stage; the full-channel median requires additional subset reads.

GALEX PAH contours are always shown, and the FITS download and contour-toggle
controls are removed. Pixel comparison provides signed differences only.

### Caching, transfer and progressive loading

- The aligned cube has a disk cache and a bounded, read-only three-field memory
  cache, independent of redshift. Per-field locks deduplicate preparation. Cache
  identities include the source release, sky grid and mask settings.
- Full-file downloads use per-file locks and a global limit of three concurrent
  transfers. Range-reading FITS workers share four upstream slots. Raw downloads
  retain source URL, release, checksum, ETag and timestamp manifests.
- `/science/extract` returns only status, stage, processing measurements and an
  immutable `resultUrl`. It never embeds pixel arrays. Each progressive revision
  references content-addressed metadata and array assets; unchanged arrays are
  fetched once and reused across revisions.
- `/science/assets/<sha>.json` contains metadata, units and provenance. `.bin`
  assets use a 32-byte `CNAR` version-1 header, little-endian float64 values, and an
  LSB-first finite-pixel validity bitset. Encoding is lossless. The service supports
  gzip, ETag/304, `Vary: Accept-Encoding`, and immutable one-year asset caching.
  Status responses remain `no-store`. Browser caches have bounded LRU capacities.
- Unmodified native subset IMAGE/NHITS/FLAGS and optional VARIANCE are retained in
  separate raw NPZ files with native pixel coordinates. Original headers and
  spectral FITS tables are retained beside them. Derived masked arrays never
  overwrite original FITS or raw subsets. HiPS cubes do not provide VARIANCE; the
  service does not invent uncertainties.
- Real visit images have small WebP previews. Native image loading starts when
  the selected viewer approaches the viewport; the selected frame comes first,
  followed by its next/previous neighbours. Distant frames warm serially during
  idle time. Playback waits at a frame boundary if its next image is not ready.
- Chemistry canvases render only when near the viewport and use a high-DPI backing
  canvas when appropriate. This improves display quality without claiming extra
  resolution in the science data.
- Future pipeline exports use content-hashed image/binary filenames, retain
  processing metadata, and generate previews. Binary `.gz` sidecars are available
  for a static host configured to serve precompressed files.

Run measurements against the running science service:

```sh
python science/benchmark.py --target m101 --output benchmark.json
```

The benchmark records job timing, upstream byte/cache counters, status payload and
latency, and compressed metadata/array transfers. Browser DevTools console and
Performance entries named `celestial:<target>/<stage>` record first/native image,
chemistry, median and GALEX readiness.

Validation:

```sh
npm run build && npm run lint && npm test
python -m unittest discover -s science -v
python -m unittest discover -s pipeline -p 'test_*.py' -v
```
