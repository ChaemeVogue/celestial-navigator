# What the real SPHEREx data taught us

Source notebook: [docs/reference/irsa-spherex-cutouts-notebook.pdf](reference/irsa-spherex-cutouts-notebook.pdf).

Notes from processing five targets with `pipeline/` (November 2026): M101, M104, M45,
M1 and M16. Preview report: https://claude.ai/artifact/2TJEFE59zmsWqwEuHHUH75
(rebuild it with `python pipeline/build_report.py`).

## The data

| Target        | Ecliptic lat. | Cutouts (3 detectors) | Visits                               |
| ------------- | ------------- | --------------------- | ------------------------------------ |
| M101 Pinwheel | +60°          | 156                   | 3 passes                             |
| M104 Sombrero | −7°           | 187                   | 3 passes + 1 short visit             |
| M45 Pleiades  | +4°           | 166                   | 3 passes                             |
| M1 Crab       | −1°           | 161                   | 3 passes                             |
| M16 Pillars   | +10°          | 201                   | 3 passes (two spread over 6–7 weeks) |

- **Any RA/Dec has data.** SPHEREx maps the whole sky; there is no fixed target list.
- **Passes are about six months apart** and each is a cluster of 15–20 exposures per
  detector over one to three weeks. Grouping by a gap of more than 30 days works.
- **Short visits exist.** M104 has a one-day visit in February 2026 with only 10
  exposures and no D1 at all, so its colour image has no blue and looks amber. We label
  any group under 20 exposures or 3 days long "Short visit" (`Pass.short` in the contract).
- **Each detector is a gradient filter.** The wavelength at the target depends on where it
  fell on the detector: D1 ran 0.74–1.11 µm across M45's images. We show the median
  (~0.9 / ~2.0 / ~4.7 µm for D1 / D3 / D6).
- **Each cutout is ~4 MB** (seven FITS layers), so one target is 0.6–0.8 GB to download,
  but its app images are three or four PNGs of ~20 KB. Download once, process, serve PNGs.
- **IRSA is slow and flaky.** The query takes 10–90 s per detector, and 5–15 of ~170
  downloads fail with HTTP 503 on each run. Retrying a minute later fetches them.

## Processing lessons

- **Request 0.15°, show 0.1°.** The camera's orientation changes by up to half a turn
  between passes. A 0.1° cutout rotated north-up leaves empty corners; a 0.15° one
  cropped after reprojecting fills the frame.
- **Subtract the ZODI layer** (smooth zodiacal-light glow) and mask FLAGS bit 0.
- **Median-combine each band within a pass.** It removes cosmic rays and hot pixels,
  which are common in single frames (bright specks in M104's raw cutouts).
- **Use the same stretch limits for every pass of a target**, or brightness flickers
  during playback.
- **Bright, frame-filling targets need a gentler stretch.** The Crab washed out to white
  with the default; `config.STRETCH` holds per-target overrides.
- **Saturated stars leave holes.** Their cores are flagged in every exposure, so the
  median is empty. We fill enclosed holes from the brightest neighbouring pixel.
- **Flip vertically** when writing PNGs (FITS rows run bottom to top).
- **Images are small:** 116 px across after reprojecting at 3.1″ per pixel (SPHEREx's
  own pixels are ~6.2″). They look soft when scaled up; that is the real resolution.

## What this means for finding movers

- **Medians hide fast movers.** Anything that moves noticeably within a one-to-three-week
  pass is removed by the median. To catch asteroids, compare individual exposures within
  a pass, not just the combined pass images.
- **Plain difference images raise false alarms.** Every bright star leaves a blue-and-amber
  ring (the star image changes shape as the camera rotates), crowded fields like M16
  are full of them, and filled saturated stars flip colour. A difference mode needs to
  ignore these, e.g. flag only spots that appear in one pass and are absent from the others.
- **Stay near the ecliptic for asteroids.** M1, M45 and M104 are the best bets; M101 at
  +60° is a good "nothing should move" control.
- **A distant Planet X would shift far more than our field.** Parallax over six months
  would be about 7–14′ for a planet 500–1000 AU away, larger than our 6′ field, so it would
  leave the frame rather than blink inside it. The blink comparator suits nearer, slower movers
  seen within a pass, or needs a wider field.

## Ideas we haven't built yet

- **Two timescales:** blink between passes (months) and flip through exposures within a
  pass (hours to days).
- **Spectrum scrubber:** slide through wavelength using each exposure's measured value.
- **Difference toggle** with the false-alarm filtering above.
- **Known-asteroid demo:** look up where an asteroid such as Vesta was during a pass
  (JPL Horizons) and cut out that patch, for a guaranteed mover.
- **More targets:** M20 Trifid (on the ecliptic), the Galactic Centre, the Horsehead,
  M82, and NGC 6543 at the north ecliptic pole, which SPHEREx images every orbit (many
  visits, but a large download).
