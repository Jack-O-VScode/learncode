#!/usr/bin/env node
/**
 * Generates the PWA icon set (`public/icons/*.png`) with zero dependencies.
 *
 * Node ships zlib, and a PNG is just a few length-prefixed, CRC'd chunks around
 * zlib-deflated scanlines, so we can rasterise the logo by hand and write real
 * PNG files without pulling in an image library.
 *
 *   npm run icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ICON_DIR = resolve(HERE, '..', 'public', 'icons')

/* ------------------------------ PNG encoding ------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

/** @param {Uint8Array} rgba RGBA pixels, row-major. */
function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter type 0 (None)
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------- rasterising ------------------------------ */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Shortest distance from point p to the segment ab. */
function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : clamp01((wx * vx + wy * vy) / len2)
  const dx = wx - t * vx
  const dy = wy - t * vy
  return Math.sqrt(dx * dx + dy * dy)
}

/** Signed distance to a rounded rectangle centred on the origin. */
function roundedRectSdf(px, py, halfW, halfH, radius) {
  const qx = Math.abs(px) - (halfW - radius)
  const qy = Math.abs(py) - (halfH - radius)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return outside + Math.min(Math.max(qx, qy), 0) - radius
}

function over(dst, src, alpha) {
  return [
    src[0] * alpha + dst[0] * (1 - alpha),
    src[1] * alpha + dst[1] * (1 - alpha),
    src[2] * alpha + dst[2] * (1 - alpha),
  ]
}

const CYAN = [56, 189, 248]
const PINK = [244, 114, 182]
const VIOLET = [167, 139, 250]
const TOP = [24, 33, 71]
const BOTTOM = [9, 13, 30]

/**
 * @param {number} size
 * @param {boolean} maskable when true the art is inset and the square is filled
 *        edge to edge, so Android/iOS can crop it to any shape safely.
 */
function drawIcon(size, maskable) {
  const px = new Uint8Array(size * size * 4)
  // The glyph is designed in a -1..1 space; maskable icons shrink it into the
  // safe zone (the outer ~20% can be cropped away by the launcher).
  const artScale = maskable ? 0.62 : 0.8
  const stroke = 0.1
  const aa = 2.2 / size // one-ish pixel of anti-aliasing, in art units

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Sample at the pixel centre, mapped to -1..1.
      const u = ((x + 0.5) / size) * 2 - 1
      const v = ((y + 0.5) / size) * 2 - 1

      // Background: vertical gradient, rounded unless this is a maskable icon.
      const g = clamp01((v + 1) / 2)
      let color = [
        TOP[0] + (BOTTOM[0] - TOP[0]) * g,
        TOP[1] + (BOTTOM[1] - TOP[1]) * g,
        TOP[2] + (BOTTOM[2] - TOP[2]) * g,
      ]
      let alpha = 1
      if (!maskable) {
        const d = roundedRectSdf(u, v, 1, 1, 0.42)
        alpha = 1 - smoothstep(-aa, aa, d)
        if (alpha <= 0) {
          const i = (y * size + x) * 4
          px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0
          continue
        }
      }

      // A soft cyan glow behind the glyph gives the flat art some depth.
      const glow = 1 - smoothstep(0, 1.15, Math.hypot(u, v + 0.05))
      color = over(color, [45, 80, 150], glow * 0.35)

      // Glyph:  </>
      const ax = u / artScale
      const ay = v / artScale
      const strokes = [
        // left chevron "<"
        { seg: [-0.28, -0.42, -0.72, 0.0], c: CYAN },
        { seg: [-0.72, 0.0, -0.28, 0.42], c: CYAN },
        // middle slash "/"
        { seg: [0.16, -0.56, -0.16, 0.56], c: PINK },
        // right chevron ">"
        { seg: [0.28, -0.42, 0.72, 0.0], c: VIOLET },
        { seg: [0.72, 0.0, 0.28, 0.42], c: VIOLET },
      ]
      for (const { seg, c } of strokes) {
        const d = distToSegment(ax, ay, seg[0], seg[1], seg[2], seg[3])
        const cover = 1 - smoothstep(stroke - aa / artScale, stroke + aa / artScale, d)
        if (cover > 0) color = over(color, c, cover)
      }

      const i = (y * size + x) * 4
      px[i] = Math.round(clamp01(color[0] / 255) * 255)
      px[i + 1] = Math.round(clamp01(color[1] / 255) * 255)
      px[i + 2] = Math.round(clamp01(color[2] / 255) * 255)
      px[i + 3] = Math.round(alpha * 255)
    }
  }
  return encodePng(size, size, px)
}

/* ---------------------------------- main ---------------------------------- */

mkdirSync(ICON_DIR, { recursive: true })

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  // iOS ignores transparency and squares the icon itself, so ship the filled art.
  ['apple-touch-icon-180.png', 180, true],
]

for (const [name, size, maskable] of targets) {
  const png = drawIcon(size, maskable)
  writeFileSync(resolve(ICON_DIR, name), png)
  console.log(`wrote icons/${name} (${size}x${size}, ${png.length} bytes)`)
}
