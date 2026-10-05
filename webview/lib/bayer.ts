// Adapted from dotscreen, a personal project of the repo author.

/** Recursive Bayer threshold matrix, normalised to 0..1. */
export function bayer(order: number): number[][] {
  let m: number[][] = [[0]]
  for (let k = 0; k < order; k++) {
    const s = m.length
    const r: number[][] = Array.from({ length: s * 2 }, () => new Array<number>(s * 2))
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = m[y][x] * 4
        r[y][x] = v
        r[y][x + s] = v + 2
        r[y + s][x] = v + 3
        r[y + s][x + s] = v + 1
      }
    }
    m = r
  }
  const n = m.length * m.length
  return m.map((row) => row.map((v) => (v + 0.5) / n))
}

export const B4 = bayer(2)
export const B8 = bayer(3)
