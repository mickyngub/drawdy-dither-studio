// Adapted from dotscreen, a personal project of the repo author.

import type { SourceEl } from '../types'

/**
 * Pixel size of a source.
 *
 * A video keeps its frame size on videoWidth/videoHeight; width/height are the
 * layout attributes and read 0 unless someone set them. Anything that scales
 * the source has to come through here, or a video collapses the field to a
 * zero width and every derived coordinate goes to NaN.
 */
export function sourceSize(el: SourceEl): { w: number; h: number } {
  return 'videoWidth' in el ? { w: el.videoWidth, h: el.videoHeight } : { w: el.width, h: el.height }
}
