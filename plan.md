# Celestial Navigator — Front-end MVP Plan

A public web tool for the NASA "Planet X and SPHEREx" hackathon challenge. Users pick a deep-sky target, see its coordinates, and step or play through every SPHEREx observation of that spot to spot anything that moves between passes. This is the modern version of the blink comparator used to find Pluto in 1930.

> **Status (14 Nov 2026):** tasks 1–9 and 11 are done. Five targets (M101, M104, M45, M1,
> M16) now show **real SPHEREx data** from `pipeline/`; M31, M42 and M51 are still
> simulated. What the real data taught us is in `docs/spherex-findings.md`, and how the
> backend should produce it is in `docs/backend-notes.md`. This file is kept as the
> original plan; where they differ, the code and those docs win.

This phase is **front end only, running on mock data**. A Django backend (built later with a teammate) will replace the mocks. Every mock must match the data contract below exactly, so swapping to the real API is a one-file change.

---

## 1. Stack

- Vite + React + TypeScript (strict mode)
- Plain CSS with CSS custom properties (no Tailwind, no component library)
- No state library: React state plus one custom hook
- Google Fonts: Poiret One, Josefin Sans, EB Garamond, Courier Prime
- Package manager: npm

## 2. Project structure

```
src/
  api/
    types.ts           # data contract (section 4)
    client.ts          # getTargets, getPasses, getColourKey; mock vs real switch
    mock/
      targets.json
      colourKey.json
      passes/
        m101.json  m31.json  m42.json  m51.json  m45.json  m104.json
  hooks/
    useExplorer.ts     # all app state (section 6)
    usePreloadImages.ts
  components/
    Header.tsx
    Divider.tsx
    TargetBar.tsx       # TargetPicker + CoordinateReadout
    SkyPlate.tsx        # image, frame, compass, pass badge, mover label
    PlateCaption.tsx
    TimelinePanel.tsx
    ColourKeyPanel.tsx
    ObservationLog.tsx
  utils/
    coords.ts          # decimal degrees → h:m:s and ±d:m:s
  styles/
    tokens.css         # design tokens (section 3)
    global.css
  App.tsx
  main.tsx
public/
  mock/images/<targetId>/pass-<n>.svg   # generated placeholder sky images
scripts/
  generate-mock-images.ts                # creates the placeholder SVGs
```

## 3. Design reference ("Chart Room × Logbook")

Art Deco chart-room frame with a scientific field-notes layer. The sky area always stays dark and clean, and the personality lives in the frame and typography.

### Colour tokens

```css
:root {
  --bg: #0a1324; /* page background */
  --panel: #101c33; /* panels */
  --panel-deep: #0e1930; /* plate caption background */
  --sky-inner: #13213d; /* sky gradient centre */
  --sky-outer: #060a14; /* sky gradient edge */
  --brass: #c9a55a; /* borders, accents, selected fills */
  --brass-light: #e3c88a; /* data values, highlighted text, link hover */
  --text: #ede6d3; /* primary text */
  --text-muted: #c4cbda; /* secondary text */
  --text-faint: #9aa5bd; /* placeholders, unreviewed rows */
  --border-soft: rgba(201, 165, 90, 0.55);
  --border-faint: rgba(201, 165, 90, 0.25);
}
```

### Typography

| Use                      | Font                 | Notes                                |
| ------------------------ | -------------------- | ------------------------------------ |
| Title, panel headings    | Poiret One           | Uppercase title, letter-spacing ~7px |
| UI text, labels, buttons | Josefin Sans 400/600 | Labels uppercase, letter-spacing 3px |
| Captions, field notes    | EB Garamond italic   | ~18–19px                             |
| Coordinates, IDs, data   | Courier Prime        | ~13–18px                             |

### Layout (desktop, max-width 1320px, fluid)

1. **Header:** compass-rose SVG logo, "CELESTIAL NAVIGATOR", subtitle "CHARTING THE SPHEREx SKY", nav links (The Chart / Observation Log / About the Colours).
2. **Divider:** thin brass line with three diamonds in the middle.
3. **Target bar** (brass-bordered panel): labelled `<select>` "Set course for a target" on the left. On the right, three read-only outputs: Right Ascension, Declination, Passes on file.
4. **Main row** (flex-wrap):
   - **Sky plate** (`flex: 999 1 560px`, max 720px wide): double brass frame with Art Deco corner brackets, square sky image (SPHEREx cutouts are square), faint 4×4 coordinate grid overlay, N/E compass letters, pass badge top-right ("PASS II OF 3"), scale bar bottom-right, dashed circle marker plus ID label on the candidate mover. Under it is the **plate caption** panel: italic caption sentence plus a monospace data line (RA h:m:s, Dec d:m:s, date, field size, bands).
   - **Side column** (`flex: 1 1 320px`): Timeframes panel, then Colour Key panel.
5. **Observation log** (full width): heading "Observation Log · {target name}", a "+ Record observation" link (non-functional for MVP), and a table (ID, RA, Dec, Seen in, Shift, Note, Status) inside an `overflow-x: auto` wrapper.

At phone width, everything stacks in a single column and the table scrolls horizontally.

## 4. Data contract (agree on this with the backend)

```ts
// src/api/types.ts
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
  label: string // "Pass I"
  date: string // ISO 8601, from time_bounds_lower
  imageUrl: string // processed, browser-ready image (PNG/WebP from the backend)
  short?: boolean // added later: a brief revisit between full passes
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
  simulated?: boolean // added later: mock placeholders only, never set by the backend
}

export type ColourKeyEntry = {
  colour: string // hex
  label: string // "Shortest band"
  wavelength: string // "~0.9 µm": median measured wavelength (was a placeholder)
}
```

### API functions (`src/api/client.ts`)

```ts
getTargets(): Promise<Target[]>                      // future: GET /api/targets
getPasses(targetId: string): Promise<PassesResponse> // future: GET /api/targets/:id/passes
getColourKey(): Promise<ColourKeyEntry[]>            // future: GET /api/colour-key
```

- Controlled by `import.meta.env.VITE_USE_MOCKS` ("true" by default in `.env`).
- Mock mode imports the JSON and resolves after a 300–600ms artificial delay, so loading states are real from day one.
- Real mode uses `fetch` against `import.meta.env.VITE_API_BASE`. Leave this implemented but unused.

**Colour is decided by the backend.** The backend combines infrared bands into the final image, so the front end just displays `imageUrl` and renders the legend from `getColourKey()`. There is only **one colour scheme** for the MVP (colour-blind-friendly). Do not build palette switching.

## 5. Mock data

### targets.json (real coordinates from the data team)

| id   | messier | name             | kind                      | ra        | dec       |
| ---- | ------- | ---------------- | ------------------------- | --------- | --------- |
| m101 | M101    | Pinwheel Galaxy  | face-on spiral galaxy     | 210.80227 | 54.34895  |
| m31  | M31     | Andromeda Galaxy | large spiral galaxy       | 10.68470  | 41.26880  |
| m42  | M42     | Orion Nebula     | star-forming nebula       | 83.82210  | -5.39110  |
| m51  | M51     | Whirlpool Galaxy | interacting spiral galaxy | 202.46960 | 47.19520  |
| m45  | M45     | Pleiades         | open star cluster         | 56.75000  | 24.11670  |
| m104 | M104    | Sombrero Galaxy  | edge-on spiral galaxy     | 189.99760 | -11.62310 |

### passes/*.json

- 2–4 passes per target (vary them: m101 2, m31 3, m42 4, m51 2, m45 3, m104 4) so the timeline handles different counts.
- Dates are placeholders roughly six months apart, starting 2025-05. Mark them clearly as mock data.
- `fieldSizeDeg`: 0.1
- One candidate per target, ID `SX-00n`, moving a few percent per pass in a consistent direction. Status "candidate".

### colourKey.json (colour-blind-friendly, placeholders)

```json
[
  { "colour": "#5AA0FF", "label": "Shortest band", "wavelength": "~1 µm" },
  { "colour": "#F4EFE2", "label": "Middle band", "wavelength": "~2 µm" },
  { "colour": "#FFB000", "label": "Longest band", "wavelength": "~4 µm" }
]
```

Blue vs. amber differ in both hue and lightness, which keeps them distinguishable for the common types of colour blindness. Final values come from the backend.

### Placeholder images (`scripts/generate-mock-images.ts`)

Generate one deterministic SVG per target per pass at `public/mock/images/<id>/pass-<n>.svg` (1200×1200, square like the real cutouts):

- Dark radial background (`--sky-inner` → `--sky-outer`)
- ~150 small stars, seeded per target so the field is identical across that target's passes, coloured from the colour key
- A soft elliptical glow representing the target, shaped by kind: a long tilted ellipse for M31, thin and edge-on for M104, a large diffuse reddish cloud for M42, roughly round for M101 and M51, and 7 bright blue-white stars with faint haze for M45
- One small amber dot at the candidate's position for that pass (must match the `positions` in the passes JSON)

Run it with an npm script (`npm run mocks`) and commit the output.

## 6. State: `useExplorer()`

Owns all state, and components only read from it.

```ts
{
  targets, targetsStatus,              // "loading" | "ready" | "error"
  selectedTarget, selectTarget(id),
  passesData, passesStatus,
  passIndex, setPassIndex(i), next(), prev(),
  isPlaying, play(), pause(), togglePlay(),
  colourKey,
}
```

Rules:

- Load targets on mount and select the first target.
- When the target changes: stop playback, reset `passIndex` to 0, fetch passes.
- `next` and `prev` wrap around.
- Play advances every 800ms and loops. Manual step or pass click pauses playback.
- Clear intervals on unmount and on target change. No stale intervals.
- Respect `prefers-reduced-motion`: don't auto-start anything. Play still works when the user presses it.

## 7. Component behaviour

**TargetBar**

- Native `<select>` with a visible `<label>`, options formatted "M101 · Pinwheel Galaxy".
- Readouts: RA and Dec in decimal degrees to 5 places with a ° sign (Dec gets an explicit +/−), plus "{n} passes".
- Use `<output>` elements with an `aria-live="polite"` region so screen readers announce the new target.

**SkyPlate**

- Shows `passes[passIndex].imageUrl` in a fixed square box (1:1, matching the SPHEREx cutouts) with `object-fit: cover`, so frames never jump.
- **Preload every pass image** for the selected target (`usePreloadImages`) before enabling Play, so playback doesn't flicker.
- Alt text: "{name}, {pass label} of {n}, observed {formatted date}".
- Overlays: grid, compass letters, pass badge, scale bar, and the candidate marker plus ID positioned from `candidates[].positions` for the current pass. Overlays use `aria-hidden` except the marker, which uses `role="img"` and an `aria-label`.
- Loading state: a dark plate with "Charting course…" in EB Garamond italic. Error state: a message plus a Retry button.

**PlateCaption**

- "Plate {n}. The field around {name} ({messier}), a {kind}, shown at pass {roman} of {total}. It and the background stars stay fixed; anything nearer that moves will shift between passes."
- Data line: `RA 14h 03m 12.5s · DEC +54° 20′ 56″ · DATE {date} · FIELD {fieldSizeDeg}° · BANDS {wavelengths joined by " / "}`.
- `utils/coords.ts` handles the conversions, with unit tests for both and for negative Dec.

**TimelinePanel**

- Heading "Timeframes" plus one line of explanation.
- A vertical timeline: brass line on the left, with one button per pass. Each button shows a diamond (filled when selected), the label, and the date. Buttons use `aria-pressed`.
- Controls row: ◀ (aria-label "Previous pass"), Play/Pause (text toggles "PLAY THROUGH TIME" / "PAUSE", brass fill while playing), ▶ (aria-label "Next pass").
- When the timeline group has focus, Left and Right arrow keys step through passes. Scope this to the group, not the whole window.
- All buttons are at least 44×44px.

**ColourKeyPanel**

- Heading "Colour Key" plus the line "Each visible colour stands in for an infrared wavelength SPHEREx measured."
- One row per entry: colour dot, label, wavelength.
- A short "Why false colour?" note: SPHEREx sees infrared light, which human eyes can't, so each band is shown as a colour we can see.

**ObservationLog**

- Table built from `candidates`, with real `<th scope="col">` headers.
- RA/Dec/Shift show "—" for now.
- "Seen in" lists the pass labels where the candidate has a position.
- Status pill: brass outline for candidate, grey outline for unreviewed.
- Add one faint placeholder row: "Next observation goes here."

## 8. Accessibility checklist

- Text contrast is at least 4.5:1 (3:1 for 24px+). Check `--text-muted` and `--text-faint` on `--panel`.
- Visible focus ring on everything (2px `--brass-light` outline, 2px offset).
- Real `<button>`, `<select>`, `<label>`, `<table>`. No clickable divs.
- Information never relies on colour alone. The selected pass also gets a filled diamond and `aria-pressed`.
- The page works at 375px wide with no horizontal page scroll (the table scrolls inside its own box).

## 9. Out of scope for the MVP

- Palette switching and live recolouring
- Recording observations (the link is visual only)
- Zoom/pan, difference images, free-text coordinate input
- The backend itself, auth, persistence

## 10. Tasks (in order)

1. [x] Scaffold Vite + React + TS, ESLint/Prettier, fonts, `tokens.css`, `global.css`
2. [x] Static layout of every section with hard-coded content, matching section 3
3. [x] `types.ts`, mock JSON files, `client.ts` with the mock/real switch and delay
4. [x] `generate-mock-images.ts` plus `npm run mocks`. Generate and commit the SVGs.
5. [x] `useExplorer` wired to the mocks. TargetBar and SkyPlate become live.
6. [x] `utils/coords.ts` plus unit tests (Vitest). PlateCaption becomes live.
7. [x] TimelinePanel: step, play/pause, keyboard, preloading, reduced motion
8. [x] ColourKeyPanel and ObservationLog from data
9. [x] Loading and error states for every fetch (the colour key fails quietly by design)
10. [ ] Accessibility pass (section 8) and responsive pass at 375 / 768 / 1280 / 1440 (375 and desktop checked so far)
11. [x] README: how to run, how to regenerate mocks, how to switch `VITE_USE_MOCKS` off

Added after the plan, from working with real data:

- [x] `pipeline/`: IRSA query → download → process → app files, for any target
- [x] Real data for M101, M104, M45, M1, M16; targets M1 and M16 added
- [x] `Pass.short` for short visits (timeline shows them smaller; target bar counts them apart)
- [x] `simulated` flag and "Simulated" plate badge for placeholder targets
- [x] Sky chart in the target bar: all targets on a whole-sky map with the ecliptic, its ±10° band and the Milky Way; click a dot or use the dropdown. Plus a "From the ecliptic" readout
- [x] Band switcher in the colour key panel: colour or one detector alone (`Pass.bandImageUrls`, `ColourKeyEntry.band`)

## 11. Definition of done

- `npm run dev` shows the full page with all six targets selectable.
- Changing the target updates the coordinates, image, caption, timeline, and log, and resets to pass 1.
- Play loops through passes smoothly with no flicker, and the candidate visibly moves.
- `npm run build` and `npm test` pass with no TypeScript errors.
- Swapping to the real API means changing only `.env` and, if needed, `client.ts`.
