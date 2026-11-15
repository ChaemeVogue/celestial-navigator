import { expect, it } from 'vitest'
import { frameOrder } from './imageQueue'

it('prioritizes selected, next and previous frames before distant frames', () => {
  expect(frameOrder(7, 3)).toEqual([3, 4, 2, 5, 6, 0, 1])
  expect(frameOrder(5, 0)).toEqual([0, 1, 4, 2, 3])
})
it('does not duplicate work for tiny lists', () => {
  expect(frameOrder(0, 0)).toEqual([])
  expect(frameOrder(1, 0)).toEqual([0])
  expect(frameOrder(2, 1)).toEqual([1, 0])
})
