// Smooth-scroll to a section, or jump straight there for people who prefer reduced motion
// (and for links that open the page on a target: browsers drop smooth scrolls during load).
export function scrollToSection(id: string, instant = false) {
  const reduce = instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
