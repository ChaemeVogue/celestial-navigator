const starts = new Map<string, number>()
const recorded = new Set<string>()
export function beginTarget(id: string) {
  starts.set(id, performance.now())
  for (const name of recorded) if (name.startsWith(`${id}/`)) recorded.delete(name)
}
export function measureTarget(id: string, stage: string) {
  const key = `${id}/${stage}`,
    start = starts.get(id)
  if (start === undefined || recorded.has(key)) return
  recorded.add(key)
  const name = `celestial:${key}`
  performance.clearMeasures(name)
  const measure = performance.measure(name, { start, end: performance.now() })
  console.debug('[celestial performance]', name, `${measure.duration.toFixed(2)} ms`)
}
