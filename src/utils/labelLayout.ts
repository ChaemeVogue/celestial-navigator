// Places name labels next to points on the sky chart without letting them overlap.
// Greedy: each label (in priority order) takes the first side that doesn't hit anything
// already placed; if every side is taken, it gets no label (null) and shows on hover.

export type Box = { x: number; y: number; w: number; h: number } // top-left corner, pixels
export type Side = 'right' | 'left' | 'above' | 'below'

export type LabelItem = {
  x: number // centre of the point, pixels
  y: number
  r: number // half the size of the point's icon
  w: number // label width
  h: number // label height
}

const SIDES: Side[] = ['right', 'left', 'above', 'below']
const GAP = 2

export function labelBox(item: LabelItem, side: Side): Box {
  const { x, y, r, w, h } = item
  switch (side) {
    case 'right':
      return { x: x + r + GAP, y: y - h / 2, w, h }
    case 'left':
      return { x: x - r - GAP - w, y: y - h / 2, w, h }
    case 'above':
      return { x: x - w / 2, y: y - r - GAP - h, w, h }
    case 'below':
      return { x: x - w / 2, y: y + r + GAP, w, h }
  }
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// obstacles: things labels must avoid (other labels already fixed, icons, dots)
export function placeLabels(items: LabelItem[], obstacles: Box[], bounds?: Box): (Side | null)[] {
  const taken = [...obstacles]
  return items.map((item) => {
    for (const side of SIDES) {
      const box = labelBox(item, side)
      const inside =
        !bounds ||
        (box.x >= bounds.x &&
          box.y >= bounds.y &&
          box.x + box.w <= bounds.x + bounds.w &&
          box.y + box.h <= bounds.y + bounds.h)
      if (inside && !taken.some((t) => overlaps(t, box))) {
        taken.push(box)
        return side
      }
    }
    return null
  })
}
