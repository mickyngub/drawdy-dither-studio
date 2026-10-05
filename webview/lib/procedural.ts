// Adapted from dotscreen, a personal project of the repo author.

/** A soft lobed blob, so the app has something on screen before any image is loaded. */
export function proceduralBlob(n = 320): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')!
  const id = g.createImageData(n, n)
  const d = id.data
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = x / n
      const v = y / n
      let s =
        Math.sin(u * 7.1 + 1.3) * Math.cos(v * 5.7 - 0.4) +
        0.6 * Math.sin(u * 13.3 - 2.1) * Math.sin(v * 11.9 + 0.8) +
        0.35 * Math.cos(u * 23.7 + v * 19.1)
      s = (s / 1.95 + 1) / 2
      const rx = (u - 0.5) * 2
      const ry = (v - 0.5) * 2
      s *= Math.max(0, 1 - Math.pow(Math.sqrt(rx * rx + ry * ry), 2.1))
      const val = Math.round(255 * (1 - s))
      const i = (y * n + x) * 4
      d[i] = d[i + 1] = d[i + 2] = val
      d[i + 3] = 255
    }
  }
  g.putImageData(id, 0, 0)
  return c
}
