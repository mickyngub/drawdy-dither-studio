// Adapted from dotscreen, a personal project of the repo author.

import type { Polarity, SourceEl } from '../types'

/**
 * A light subject on a dark ground needs the opposite polarity, or the background
 * becomes the dots. Mean luminance decides it, which is right far more often than not.
 */
export function autoPolarity(el: SourceEl): Polarity {
  const s = document.createElement('canvas')
  s.width = s.height = 64
  const g = s.getContext('2d', { willReadFrequently: true })!
  g.drawImage(el, 0, 0, 64, 64)
  const d = g.getImageData(0, 0, 64, 64).data
  let sum = 0
  for (let p = 0; p < d.length; p += 4) {
    sum += 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]
  }
  return sum / 4096 / 255 < 0.5 ? 1 : 0
}
