import './Divider.css'

export default function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <span className="divider__line" />
      <svg className="divider__diamonds" viewBox="0 0 56 12">
        <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="none" stroke="var(--brass)" />
        <path d="M28 0 L34 6 L28 12 L22 6 Z" fill="var(--brass)" />
        <path d="M50 1 L55 6 L50 11 L45 6 Z" fill="none" stroke="var(--brass)" />
      </svg>
      <span className="divider__line" />
    </div>
  )
}
