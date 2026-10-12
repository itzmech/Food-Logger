/**
 * Generates the PWA icon set with zero dependencies.
 *
 * Writes real PNG files (RGBA, 8-bit) using Node's zlib for compression.
 * Run with: npm run icons
 *
 * Design: dark rounded-square tile + violet lightning bolt (energy/progress mark).
 * The maskable variant is full-bleed so Android can crop it to any shape.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'public/icons')

/* ------------------------------------------------------------------ */
/* PNG encoding                                                        */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

/** @param {Buffer} rgba width*height*4 bytes */
function encodePng(rgba, width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Raw scanlines, each prefixed with filter byte 0 (None)
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------------ */
/* Vector helpers                                                      */
/* ------------------------------------------------------------------ */

/** Signed distance to a rounded rectangle. Negative = inside. */
function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius)
  const dy = Math.abs(y - cy) - (halfH - radius)
  const ax = Math.max(dx, 0)
  const ay = Math.max(dy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius
}

/** Even-odd point-in-polygon test. */
function inPolygon(x, y, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Lightning bolt, normalised to a 0..1 design box. */
const BOLT = [
  [0.6, 0.04],
  [0.2, 0.56],
  [0.44, 0.56],
  [0.36, 0.96],
  [0.8, 0.4],
  [0.52, 0.4],
]

function scalePolygon(points, size, offsetX, offsetY) {
  return points.map(([x, y]) => [offsetX + x * size, offsetY + y * size])
}

function mix(a, b, t) {
  return a + (b - a) * t
}

/* ------------------------------------------------------------------ */
/* Icon rendering                                                      */
/* ------------------------------------------------------------------ */

const BG_TOP = [18, 20, 30]
const BG_BOTTOM = [9, 10, 15]
const ACCENT_TOP = [167, 139, 250] // violet-400
const ACCENT_BOTTOM = [124, 58, 237] // violet-600

/**
 * @param {number} size
 * @param {{ rounded: boolean, boltScale: number }} options
 */
function renderIcon(size, { rounded, boltScale }) {
  const rgba = Buffer.alloc(size * size * 4)
  const samples = 3 // 3x3 supersampling for smooth edges
  const radius = rounded ? size * 0.235 : 0
  const boltSize = size * boltScale
  const bolt = scalePolygon(BOLT, boltSize, (size - boltSize) / 2, (size - boltSize) / 2)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgCoverage = 0
      let boltCoverage = 0
      let boltT = 0

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = px + (sx + 0.5) / samples
          const y = py + (sy + 0.5) / samples

          const inTile = rounded
            ? roundedRectDistance(x, y, size / 2, size / 2, size / 2, size / 2, radius) <= 0
            : true
          if (inTile) bgCoverage++

          if (inPolygon(x, y, bolt)) {
            boltCoverage++
            boltT += y / size
          }
        }
      }

      const total = samples * samples
      const bg = bgCoverage / total
      const fg = boltCoverage / total
      const t = boltCoverage > 0 ? boltT / boltCoverage : 0.5

      // Background: vertical gradient, fading in with tile coverage.
      const bgR = mix(BG_TOP[0], BG_BOTTOM[0], py / size)
      const bgG = mix(BG_TOP[1], BG_BOTTOM[1], py / size)
      const bgB = mix(BG_TOP[2], BG_BOTTOM[2], py / size)

      // Bolt: vertical accent gradient.
      const fgR = mix(ACCENT_TOP[0], ACCENT_BOTTOM[0], t)
      const fgG = mix(ACCENT_TOP[1], ACCENT_BOTTOM[1], t)
      const fgB = mix(ACCENT_TOP[2], ACCENT_BOTTOM[2], t)

      const alpha = Math.min(1, bg)
      const r = mix(bgR, fgR, fg)
      const g = mix(bgG, fgG, fg)
      const b = mix(bgB, fgB, fg)

      const i = (py * size + px) * 4
      rgba[i] = Math.round(r)
      rgba[i + 1] = Math.round(g)
      rgba[i + 2] = Math.round(b)
      rgba[i + 3] = Math.round(alpha * 255)
    }
  }

  return encodePng(rgba, size, size)
}

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

mkdirSync(OUT_DIR, { recursive: true })

const outputs = [
  ['icon-192.png', renderIcon(192, { rounded: true, boltScale: 0.66 })],
  ['icon-512.png', renderIcon(512, { rounded: true, boltScale: 0.66 })],
  ['maskable-512.png', renderIcon(512, { rounded: false, boltScale: 0.52 })],
  ['apple-touch-icon.png', renderIcon(180, { rounded: false, boltScale: 0.62 })],
]

for (const [name, buffer] of outputs) {
  writeFileSync(resolve(OUT_DIR, name), buffer)
  console.log(`wrote public/icons/${name} (${(buffer.length / 1024).toFixed(1)} kB)`)
}
