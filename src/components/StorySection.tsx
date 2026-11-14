import type { ReactNode } from 'react'
import './StorySection.css'

type Props = {
  onChooseStar: () => void // back up to the dome
}

// Engraving-style line art, drawn here so the project ships no image files.
// Each picture is 160 × 120. The hatch pattern for shading is defined once, below.
function HatchDefs() {
  return (
    <svg className="story__defs" aria-hidden="true">
      <defs>
        <pattern
          id="story-hatch"
          width="2.6"
          height="2.6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="2.6" />
        </pattern>
      </defs>
    </svg>
  )
}

// 1930: two plates of the same stars; one dot jumps between them
const BLINK_STARS = [
  [22, 30, 1.6],
  [48, 18, 1],
  [70, 44, 2],
  [104, 26, 1.2],
  [130, 52, 1.6],
  [36, 70, 1.1],
  [92, 78, 1.5],
  [120, 92, 1],
  [58, 96, 1.3],
  [140, 20, 0.9],
]
function BlinkArt() {
  return (
    <svg viewBox="0 0 160 120" className="story__art" aria-hidden="true">
      <rect className="story__plate" x="6" y="6" width="148" height="108" />
      {BLINK_STARS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} className="story__star" cx={x} cy={y} r={r} />
      ))}
      <circle className="story__mover story__mover--a" cx="78" cy="60" r="1.6" />
      <circle className="story__mover story__mover--b" cx="86" cy="58" r="1.6" />
      <circle className="story__ring story__mover--a" cx="78" cy="60" r="6" />
      <circle className="story__ring story__mover--b" cx="86" cy="58" r="6" />
      <text className="story__plate-label story__mover--a" x="148" y="108" textAnchor="end">
        23 JAN 1930
      </text>
      <text className="story__plate-label story__mover--b" x="148" y="108" textAnchor="end">
        29 JAN 1930
      </text>
    </svg>
  )
}

// SPHEREx: the telescope's nested cone shields, and the infrared range it sees
function TelescopeArt() {
  return (
    <svg viewBox="0 0 160 120" className="story__art" aria-hidden="true">
      <path className="story__fill" d="M52 18 L108 18 L94 70 L66 70 Z" />
      <path className="story__line" d="M52 18 L108 18 L94 70 L66 70 Z" />
      <path className="story__line" d="M60 28 L100 28 L90 70" />
      <path className="story__line" d="M68 40 L92 40 L86 70" />
      <rect className="story__line" x="68" y="70" width="24" height="10" />
      <path className="story__line" d="M58 80 H102 M64 84 H96" />
      {/* rays of starlight coming in */}
      <path className="story__ray" d="M30 2 L64 30 M80 0 L80 24 M130 2 L96 30" />
      {/* spectrum bar: 0.75 to 5 µm, in the app's colour-key colours */}
      <defs>
        <linearGradient id="story-spectrum">
          <stop offset="0%" stopColor="#5AA0FF" />
          <stop offset="50%" stopColor="#F4EFE2" />
          <stop offset="100%" stopColor="#FFB000" />
        </linearGradient>
      </defs>
      <rect x="22" y="96" width="116" height="6" fill="url(#story-spectrum)" opacity="0.85" />
      <text className="story__axis" x="22" y="114">
        0.75 µm
      </text>
      <text className="story__axis" x="138" y="114" textAnchor="end">
        5 µm
      </text>
    </svg>
  )
}

// The ecliptic: a planet sliding along the band where planets and asteroids travel
const ECLIPTIC_PATH = 'M10 66 C 40 92, 60 92, 80 60 S 120 28, 150 54'
function EclipticArt() {
  return (
    <svg viewBox="0 0 160 120" className="story__art" aria-hidden="true">
      <ellipse className="story__line" cx="80" cy="60" rx="74" ry="46" />
      <path className="story__band" d={ECLIPTIC_PATH} />
      <path className="story__line story__line--brass" d={ECLIPTIC_PATH} />
      <circle className="story__star" cx="34" cy="34" r="1.2" />
      <circle className="story__star" cx="120" cy="88" r="1.4" />
      <circle className="story__star" cx="62" cy="28" r="0.9" />
      <circle className="story__star" cx="100" cy="96" r="1" />
      <circle className="story__planet" r="3" style={{ offsetPath: `path('${ECLIPTIC_PATH}')` }} />
    </svg>
  )
}

// Your turn: an armillary sphere, the astronomer's instrument
function ArmillaryArt() {
  return (
    <svg viewBox="0 0 160 120" className="story__art" aria-hidden="true">
      <circle className="story__line story__line--brass" cx="80" cy="54" r="40" />
      <ellipse className="story__line" cx="80" cy="54" rx="40" ry="11" />
      <ellipse
        className="story__line story__line--brass"
        cx="80"
        cy="54"
        rx="40"
        ry="11"
        transform="rotate(-23.4 80 54)"
      />
      <ellipse className="story__line" cx="80" cy="54" rx="12" ry="40" />
      <path className="story__line" d="M80 6 V102" />
      <circle className="story__fill story__line" cx="80" cy="54" r="5" />
      <path className="story__fill" d="M62 104 H98 L92 112 H68 Z" />
      <path className="story__line" d="M62 104 H98 L92 112 H68 Z M80 94 V104" />
    </svg>
  )
}

type Card = { numeral: string; title: string; art: ReactNode; text: string }

const CARDS: Card[] = [
  {
    numeral: 'I',
    title: 'The blink',
    art: <BlinkArt />,
    text: 'In 1930, Clyde Tombaugh flipped between two photos of the same stars. One dot jumped. It was Pluto.',
  },
  {
    numeral: 'II',
    title: 'SPHEREx',
    art: <TelescopeArt />,
    text: 'NASA’s SPHEREx telescope photographs the whole sky in infrared, then does it again every six months.',
  },
  {
    numeral: 'III',
    title: 'The ecliptic',
    art: <EclipticArt />,
    text: 'Planets and asteroids travel along one band of sky. Targets near it are the best places to catch something moving.',
  },
]

export default function StorySection({ onChooseStar }: Props) {
  return (
    <section className="story" id="story" aria-labelledby="story-heading">
      <HatchDefs />
      <p className="story__eyebrow">The story</p>
      <h2 id="story-heading" className="story__heading">
        How to find a moving world
      </h2>

      <ol className="story__cards">
        {CARDS.map((card) => (
          <li key={card.numeral} className="story__card">
            {card.art}
            <h3 className="story__title">
              <span className="story__numeral">{card.numeral}</span> {card.title}
            </h3>
            <p className="story__text">{card.text}</p>
          </li>
        ))}
        <li className="story__card story__card--cta">
          <ArmillaryArt />
          <h3 className="story__title">
            <span className="story__numeral">IV</span> Your turn
          </h3>
          <p className="story__text">
            Pick a star, blink the passes, and look for anything that moves.
          </p>
          <button type="button" className="story__button" onClick={onChooseStar}>
            Choose a star
          </button>
        </li>
      </ol>
    </section>
  )
}
