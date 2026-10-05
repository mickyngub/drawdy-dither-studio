// Adapted from dotscreen, a personal project of the repo author.

import type { Params } from '../types'

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Normalised luminance to dot appetite: polarity, levels, gamma, posterize. */
export function makeTone(p: Params): (norm: number) => number {
  const range = Math.max(1e-4, p.hi - p.lo)
  const steps = p.posterize >= 2 ? p.posterize : 0
  return (norm) => {
    let k = p.invert ? norm : 1 - norm
    k = clamp01((k - p.lo) / range)
    k = Math.pow(k, p.gamma)
    if (steps) k = Math.round(k * (steps - 1)) / (steps - 1)
    return k
  }
}

/** Radial knockout toward the frame edge. Applied last, always. */
export function makeVignette(p: Params, w: number, h: number): (x: number, y: number) => number {
  if (p.vig <= 0) return () => 1
  const cx = (w - 1) / 2
  const cy = (h - 1) / 2
  const edge = 1 - p.vig * 0.95
  return (x, y) => {
    const rx = (x - cx) / Math.max(cx, 1e-6)
    const ry = (y - cy) / Math.max(cy, 1e-6)
    return 1 - smoothstep(edge, 1, Math.sqrt(rx * rx + ry * ry) / Math.SQRT2)
  }
}
