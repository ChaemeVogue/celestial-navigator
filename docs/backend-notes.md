# Backend notes

How the Django backend should produce the data the front end expects
(`src/api/types.ts`). `pipeline/` already does every step below as scripts, so the
backend can wrap or port it. What we learned from real data is in
[spherex-findings.md](spherex-findings.md).

## Endpoints the front end calls

```
GET /api/targets                 -> Target[]
GET /api/targets/:id/passes      -> PassesResponse
GET /api/colour-key              -> ColourKeyEntry[]
```

`src/api/mock/` holds working examples of every response. The passes files for M101,
M104, M45, M1 and M16 are real data written by `pipeline/to_app.py`.

**Do all IRSA work ahead of time** (a management command, or a job per target) and serve
cached PNGs. The API must never call IRSA while someone is waiting for a page: the query
takes up to a minute per detector and some downloads fail every run.

## Steps (what `pipeline/` does)

1. **Query** IRSA TAP once per detector, D1, D3 and D6 (`pipeline/query.py`):

   ```sql
   SELECT
       'https://irsa.ipac.caltech.edu/' || a.uri || '?center={ra},{dec}d&size=0.15' AS uri,
       p.time_bounds_lower
   FROM spherex.artifact a
   JOIN spherex.plane p ON a.planeid = p.planeid
   WHERE 1 = CONTAINS(POINT('ICRS', {ra}, {dec}), p.poly)
         AND p.energy_bandpassname = 'SPHEREx-D1'
   ORDER BY p.time_bounds_lower
   ```

   One row is one exposure: a cutout URL centred on the target and its start time (MJD).
   Request **0.15°** even though the app shows 0.1°, so the corners stay filled after
   rotating north-up.

2. **Download** each cutout, 8 at a time, retrying HTTP 503s (`pipeline/download.py`).
   Record the wavelength at the target pixel from the `WCS-WAVE` layer.

3. **Process** (`pipeline/process.py`):
   - group exposures into visits by a gap of more than 30 days; a group under 20
     exposures or 3 days long is a short visit
   - subtract the `ZODI` layer, mask `FLAGS` bit 0
   - reproject onto one north-up TAN grid per target (0.1°, 116 px) with
     `reproject.reproject_interp`
   - median-combine each band within a visit, fill saturated-star holes
   - asinh-stretch with the same limits for every visit of a target
   - colour-combine D1 → #5AA0FF, D3 → #F4EFE2, D6 → #FFB000, flip vertically, save PNG

4. **Serve** (`pipeline/to_app.py` writes the mock JSON in this shape):

| Contract field                | Value                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Pass.label`                  | "Pass I", "Pass II", … or "Short visit"                                                                                                         |
| `Pass.date`                   | mean observation time of the visit, ISO 8601 (`Time(mjd, format="mjd").isot + "Z"`)                                                             |
| `Pass.imageUrl`               | the visit's colour PNG, e.g. `/media/m101/pass-1.png`                                                                                           |
| `Pass.short`                  | `true` for short visits, otherwise omit                                                                                                         |
| `Pass.bandImageUrls`          | `{ "D1": url, "D3": url, "D6": url }`: each detector alone, greyscale, same stretch as the colour image; leave a band out if the visit has none |
| `PassesResponse.fieldSizeDeg` | `0.1` (the reprojected grid, not the 0.15° request)                                                                                             |
| `PassesResponse.candidates`   | `[]` until we detect movers; positions are 0–100 % of the image                                                                                 |
| `PassesResponse.simulated`    | never set by the backend (mock placeholders only)                                                                                               |
| `ColourKeyEntry.wavelength`   | median measured wavelength per detector, e.g. "~0.9 µm"                                                                                         |
| `ColourKeyEntry.band`         | detector id, `"D1"`, matching the `bandImageUrls` keys                                                                                          |

## Decided

- **Detectors:** D1, D3, D6 for a wide spread across 0.75–5 µm.
- **Alignment:** reproject everything onto a shared north-up grid; candidate positions
  come from RA/Dec through that grid's WCS.
- **Images:** square PNGs, 116 px (the real resolution, scaled up by the browser).
- **Data releases:** some exposures appear twice (`l2b` and `l2b_retry`); keep one.
- **Input safety:** the ADQL is built with an f-string. Only ever fill it from our own
  target list, never from raw user input.

## Open

- **Mover detection.** Medians remove anything that moves within a pass, and plain
  differences flag every bright star. See spherex-findings.md for what a detector needs.
- **Any coordinates (the challenge's core ask).** The front end already accepts typed RA/Dec
  and `?ra=&dec=` links; today it can only show processed targets. Proposed endpoint:

  ```
  GET /api/passes?ra=133.79513&dec=-7.24515
    200 -> PassesResponse            already processed (cache hit)
    202 -> { "status": "processing", "etaSeconds": 300 }   queued; poll again
  ```

  Process on demand with the pipeline steps, cache by rounded position (e.g. 0.01°),
  and keep the curated targets pre-processed so the demo never waits.

- **Fast movers need today's position.** Barnard's Star, Epsilon Indi B and WISE 0855
  move arcseconds per year, so catalogue (J2000) positions are several arcminutes off.
  Propagate with proper motion (astropy `apply_space_motion`) before cutting out.

## Connecting in development

1. Run Django on `http://localhost:8000` (or set `API_PROXY_TARGET` in `.env`).
2. Set `VITE_USE_MOCKS=false` in `.env` and restart `npm run dev`.

The Vite dev server forwards `/api/*` and `/media/*` to Django, so the browser sees one
origin. **No CORS setup is needed**, and `imageUrl` can be a relative path such as
`/media/m101/pass-1.png`. Serve the PNGs under `/media/` (Django's `MEDIA_URL`), or add
another prefix to `server.proxy` in `vite.config.ts`. Trailing slashes are fine: a Django
redirect from `/api/targets` to `/api/targets/` is followed.

## Connecting a deployed build

Set `VITE_API_BASE=https://your-backend` before `npm run build`. Relative `imageUrl`
values are then resolved against that address, and Django will need CORS allowing the
front end's origin (e.g. `django-cors-headers`).
