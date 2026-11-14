import type { ReactNode } from 'react'
import type { BodyId } from '../utils/planets'

// Small, familiar planet pictures for the sky chart: red Mars, banded Jupiter, ringed Saturn.
// Sizes are for recognition, not to scale. All drawn in a 24 × 24 box; the shared shading
// gradient (#planet-shine) is defined once by PlanetIconDefs.

export function PlanetIconDefs() {
  return (
    <svg width="0" height="0" className="planet-icon__defs" aria-hidden="true">
      <defs>
        <radialGradient id="planet-shine" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
        </radialGradient>
        <clipPath id="planet-jupiter-clip">
          <circle cx="12" cy="12" r="7" />
        </clipPath>
      </defs>
    </svg>
  )
}

// A shaded disc: base colour plus the shared highlight and shadow
function Disc({ r, fill }: { r: number; fill: string }) {
  return (
    <>
      <circle cx="12" cy="12" r={r} fill={fill} />
      <circle cx="12" cy="12" r={r} fill="url(#planet-shine)" />
    </>
  )
}

const ART: Record<BodyId, ReactNode> = {
  sun: (
    <>
      <g stroke="#FFD27A" strokeWidth="1.4" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="12" y1="2" x2="12" y2="5" transform={`rotate(${i * 45} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="5.5" fill="#FFD27A" />
      <circle cx="12" cy="12" r="5.5" fill="url(#planet-shine)" opacity="0.6" />
    </>
  ),
  moon: (
    <>
      <Disc r={5} fill="#D9D6CE" />
      <circle cx="10" cy="10.5" r="1.1" fill="rgba(90,90,90,0.35)" />
      <circle cx="13.6" cy="13.2" r="0.8" fill="rgba(90,90,90,0.35)" />
    </>
  ),
  mercury: <Disc r={3.2} fill="#B9B3AA" />,
  venus: <Disc r={4.4} fill="#F2E2B3" />,
  mars: <Disc r={3.8} fill="#D9603B" />,
  jupiter: (
    <>
      <circle cx="12" cy="12" r="7" fill="#D8B48A" />
      <g clipPath="url(#planet-jupiter-clip)" fill="#A9774E">
        <rect x="4" y="8.6" width="16" height="1.4" />
        <rect x="4" y="12.6" width="16" height="1.8" />
        <rect x="4" y="16" width="16" height="1" opacity="0.7" />
      </g>
      <ellipse cx="14.6" cy="13.5" rx="1.4" ry="0.8" fill="#C0533A" />
      <circle cx="12" cy="12" r="7" fill="url(#planet-shine)" />
    </>
  ),
  saturn: (
    <g transform="rotate(-18 12 12)">
      {/* back half of the ring, then the planet, then the front half */}
      <path d="M2.5 12 A9.5 3 0 0 1 21.5 12" fill="none" stroke="#CDB57E" strokeWidth="1.3" />
      <Disc r={4.8} fill="#E8CF8E" />
      <path d="M2.5 12 A9.5 3 0 0 0 21.5 12" fill="none" stroke="#CDB57E" strokeWidth="1.3" />
    </g>
  ),
  uranus: <Disc r={4.2} fill="#9FD8DF" />,
  neptune: <Disc r={4.2} fill="#5B83E6" />,
}

export default function PlanetIcon({ id }: { id: BodyId }) {
  return (
    <svg className="planet-icon" viewBox="0 0 24 24" aria-hidden="true">
      {ART[id]}
    </svg>
  )
}
