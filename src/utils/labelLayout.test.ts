import { describe, expect, it } from 'vitest'
import { labelBox, placeLabels } from './labelLayout'

const item = (x: number, y: number) => ({ x, y, r: 10, w: 40, h: 16 })

describe('placeLabels', () => {
  it('puts a lone label on the right', () => {
    expect(placeLabels([item(100, 100)], [])).toEqual(['right'])
  })

  it('moves a label aside when its neighbour already took the space', () => {
    // two points side by side: the first takes the right, the second can't, so it goes left
    expect(placeLabels([item(100, 100), item(80, 100)], [])).toEqual(['right', 'left'])
  })

  it('avoids obstacles such as icons', () => {
    const icon = labelBox(item(100, 100), 'right') // something sitting where the label would go
    expect(placeLabels([item(100, 100)], [icon])).toEqual(['left'])
  })

  it('gives up (null) when every side is blocked', () => {
    const wall = { x: 0, y: 0, w: 1000, h: 1000 }
    expect(placeLabels([item(100, 100)], [wall])).toEqual([null])
  })

  it('keeps labels inside the bounds', () => {
    const bounds = { x: 0, y: 0, w: 140, h: 200 }
    // near the right edge, so the right side would spill out
    expect(placeLabels([item(120, 100)], [], bounds)).toEqual(['left'])
  })
})
