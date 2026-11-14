import './Header.css'

function CompassRose() {
  return (
    <svg className="header__logo" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--brass)" strokeWidth="1" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="var(--border-faint)" strokeWidth="1" />
      <g fill="var(--brass)">
        <path d="M32 4 L36 28 L32 32 L28 28 Z" />
        <path d="M32 60 L28 36 L32 32 L36 36 Z" opacity="0.5" />
        <path d="M4 32 L28 28 L32 32 L28 36 Z" opacity="0.5" />
        <path d="M60 32 L36 36 L32 32 L36 28 Z" opacity="0.5" />
      </g>
      <g fill="var(--brass-light)" opacity="0.6">
        <path d="M32 32 L46 18 L38 30 Z" />
        <path d="M32 32 L18 46 L26 34 Z" />
        <path d="M32 32 L18 18 L30 26 Z" />
        <path d="M32 32 L46 46 L34 38 Z" />
      </g>
      <circle cx="32" cy="32" r="2.5" fill="var(--bg)" stroke="var(--brass-light)" />
    </svg>
  )
}

export default function Header() {
  return (
    <header className="header">
      <a className="header__brand" href="#chart">
        <CompassRose />
        <span className="header__titles">
          <span className="header__title">Celestial Navigator</span>
          <span className="header__subtitle">Charting the SPHEREx sky</span>
        </span>
      </a>
      <nav className="header__nav" aria-label="Main">
        <a href="#chart">The Chart</a>
        <a href="#log">Observation Log</a>
        <a href="#colours">About the Colours</a>
      </nav>
    </header>
  )
}
