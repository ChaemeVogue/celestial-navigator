# Celestial Navigator

A blink comparator for the NASA "Planet X and SPHEREx" hackathon challenge. Pick a
deep-sky target, see its coordinates, and step or play through every SPHEREx pass over
that spot to look for anything that moves. It's the modern version of the comparator
used to find Pluto in 1930.

- **Front end:** Vite, React, strict TypeScript, plain CSS (this folder).
- **Data:** five targets use real SPHEREx images made by [`pipeline/`](pipeline/README.md);
  M31, M42 and M51 are simulated placeholders, marked "Simulated" in the app.
- **Backend:** Django, in progress. The contract it must serve is
  [`src/api/types.ts`](src/api/types.ts); see [docs/backend-notes.md](docs/backend-notes.md).

## Run it

Needs Node 20.19 or newer (Vite 8).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command          | What it does                                 |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | dev server with mock data                    |
| `npm test`       | unit tests (Vitest)                          |
| `npm run build`  | type-check and production build into `dist/` |
| `npm run lint`   | oxlint                                       |
| `npm run format` | Prettier                                     |
| `npm run mocks`  | regenerate the simulated placeholder SVGs    |

## Switching to the real backend

Data comes from `src/api/client.ts`, which reads `.env`:

| Variable           | Default                 | Meaning                                                 |
| ------------------ | ----------------------- | ------------------------------------------------------- |
| `VITE_USE_MOCKS`   | `true`                  | `false` calls the Django API instead of `src/api/mock/` |
| `API_PROXY_TARGET` | `http://localhost:8000` | where the dev server forwards `/api` and `/media`       |
| `VITE_API_BASE`    | empty                   | backend address for a deployed build only               |

Set `VITE_USE_MOCKS=false`, run Django on port 8000 and restart `npm run dev`. Details,
including deployment, are in [docs/backend-notes.md](docs/backend-notes.md).

## Adding a real target

1. Add it to `src/api/mock/targets.json` (id, Messier number, name, kind, RA/Dec).
2. Run `pipeline/.venv/bin/python pipeline/run.py <id>` (setup in
   [pipeline/README.md](pipeline/README.md)). It writes the images and passes JSON.

## Project layout

```
src/
  api/          types.ts (data contract), client.ts (mock/real switch), mock/ (JSON)
  hooks/        useExplorer (all app state), usePreloadImages
  components/   one component + CSS file per panel
  utils/        coordinate and date formatting (with tests)
  styles/       design tokens and shared styles
public/mock/    pass images: real PNGs and simulated SVGs
pipeline/       Python scripts: IRSA query → download → process → app files
scripts/        generate-mock-images.ts (simulated placeholders)
docs/           backend notes, what we learned from the real data
plan.md         the original front-end plan and task list
```
