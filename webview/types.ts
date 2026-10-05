// Adapted from dotscreen, a personal project of the repo author.

export type DitherMode = 'fs' | 'b4' | 'b8' | 'bn' | 'thr'
export type DotShape = 'circle' | 'square'
export type Polarity = 0 | 1
/** `dots` is the halftone field; `pixel` fills whole cells, Figma's dither shader. */
export type RenderStyle = 'dots' | 'pixel'
export type ColourMode = 0 | 1

/** Everything the renderer needs. One flat object so a change is one state update. */
export interface Params {
  grid: number       // cells across
  cell: number       // px per cell
  dot: number        // px diameter of the mark inside a cell
  lo: number         // ink floor, raises the threshold so faint areas drop out
  hi: number         // ink ceiling
  gamma: number
  posterize: number  // 0 = off, else levels
  vig: number        // 0..1, radial knockout toward the frame edge
  blur: number       // source softening, px
  dither: DitherMode
  shape: DotShape
  invert: Polarity   // 1 = subject is lighter than its ground
  ink: string
  paper: string
  style: RenderStyle
  levels: number     // 2..8 shades, pixel style only
  colour: ColourMode // 1 = keep the source's own colours, pixel style only
}

/** Per-cell dot appetite, 0..1, after every tonal adjustment. */
export interface InkField {
  data: Float32Array
  w: number
  h: number
  /**
   * The source pixels the field was built from, RGBA, w*h*4. Post-blur but never
   * tone-mapped: colour mode dithers these directly, so the luminance pipeline
   * must not have touched them. Only kept when asked for.
   */
  rgb?: Uint8ClampedArray
}

export type SourceEl = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement

export interface Source {
  id: string
  name: string
  el: SourceEl
  /**
   * A playing video. The id no longer identifies a set of pixels, because they
   * change on their own, so nothing derived from the source can be cached.
   */
  live?: boolean
}
