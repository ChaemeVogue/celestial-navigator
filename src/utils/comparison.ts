export function difference(a: ArrayLike<number | null>, b: ArrayLike<number | null>) {
  if (a.length !== b.length) throw new Error('Images must use the same pixel grid.')
  return Array.from(a, (value, i) =>
    value === null || b[i] === null || !Number.isFinite(value) || !Number.isFinite(b[i])
      ? null
      : (b[i] as number) - value,
  )
}
