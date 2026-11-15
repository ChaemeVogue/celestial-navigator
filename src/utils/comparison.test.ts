import { expect, it } from 'vitest'
import { difference } from './comparison'
it('subtracts B minus A and preserves signed residuals and missing coverage', () => {
  expect(difference([2, 5, null, NaN], [7, 1, 9, 3])).toEqual([5, -4, null, null])
})
it('rejects mismatched pixel counts', () => {
  expect(() => difference([1], [1, 2])).toThrow('same pixel grid')
})
