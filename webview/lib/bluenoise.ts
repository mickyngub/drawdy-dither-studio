// Adapted from dotscreen, a personal project of the repo author.

const S = 64
const N = S * S
const SIGMA = 1.9
// exp(-8^2 / 2sigma^2) is 1.4e-4, so nothing past eight cells moves a decision.
const RAD = 8

// Fixed seed, never Math.random: the same image has to dither the same way in
// every session, and an export has to match what was on screen.
let seed = 0x9e3779b9 >>> 0
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296

const span = RAD * 2 + 1
const kdx = new Int8Array(span * span)
const kdy = new Int8Array(span * span)
const kw = new Float32Array(span * span)
let kn = 0
for (let dy = -RAD; dy <= RAD; dy++) {
  for (let dx = -RAD; dx <= RAD; dx++) {
    kdx[kn] = dx
    kdy[kn] = dy
    kw[kn] = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA))
    kn++
  }
}

/**
 * Add (sign 1) or remove (sign -1) one point's contribution. The energy field is
 * kept incrementally rather than refiltered: refiltering per placement is what
 * makes the naive void-and-cluster cubic, and this is the whole reason a 64x64
 * matrix can be generated at load instead of shipped as a literal.
 */
function splat(e: Float32Array, i: number, sign: number): void {
  const x = i & (S - 1)
  const y = i >> 6
  for (let k = 0; k < kn; k++) {
    // Toroidal, so the pattern still tiles when the matrix wraps over an image.
    e[((((y + kdy[k]) & (S - 1)) << 6) | ((x + kdx[k]) & (S - 1)))] += sign * kw[k]
  }
}

/** Tightest cluster (want 1, most energy) or largest void (want 0, least). */
function extreme(e: Float32Array, pat: Uint8Array, want: number): number {
  let best = 0
  let bv = want ? -Infinity : Infinity
  for (let i = 0; i < N; i++) {
    if (pat[i] !== want) continue
    if (want ? e[i] > bv : e[i] < bv) {
      bv = e[i]
      best = i
    }
  }
  return best
}

function build(): number[][] {
  const pat = new Uint8Array(N)
  const e = new Float32Array(N)
  const rank = new Int32Array(N)
  const ones = Math.round(N * 0.1)

  for (let placed = 0; placed < ones; ) {
    const i = (rnd() * N) | 0
    if (pat[i]) continue
    pat[i] = 1
    splat(e, i, 1)
    placed++
  }

  // Relax the random seeding into blue noise: pull the tightest cluster apart
  // into the largest void until the point removed is the point put back.
  for (let it = 0; it < ones * 8; it++) {
    const c = extreme(e, pat, 1)
    pat[c] = 0
    splat(e, c, -1)
    const v = extreme(e, pat, 0)
    pat[v] = 1
    splat(e, v, 1)
    if (v === c) break
  }
  const proto = pat.slice()
  const protoE = e.slice()

  // Down: strip the prototype, tightest cluster first. Last point left is rank 0.
  for (let r = ones - 1; r >= 0; r--) {
    const c = extreme(e, pat, 1)
    pat[c] = 0
    splat(e, c, -1)
    rank[c] = r
  }

  // Up: from the prototype again, fill the largest void each time. This one pass
  // covers Ulichney's phases two and three, which coincide for a toroidal kernel:
  // the complemented pattern's tightest cluster is the same pixel as this void.
  pat.set(proto)
  e.set(protoE)
  for (let r = ones; r < N; r++) {
    const v = extreme(e, pat, 0)
    pat[v] = 1
    splat(e, v, 1)
    rank[v] = r
  }

  const m: number[][] = []
  for (let y = 0; y < S; y++) {
    const row = new Array<number>(S)
    for (let x = 0; x < S; x++) row[x] = (rank[(y << 6) | x] + 0.5) / N
    m.push(row)
  }
  return m
}

/**
 * 64x64 blue-noise threshold matrix, normalised like the Bayer ones. Same job as
 * Bayer, without the crosshatch: the ranks are spread so no spatial frequency
 * below the eye's cutoff clumps, which is why it reads as grain and not as grid.
 */
export const BN64 = build()
