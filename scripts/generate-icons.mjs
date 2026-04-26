#!/usr/bin/env node
// Generate PNG icons from the brand SVG using a tiny pure-JS rasterizer.
// We avoid external image deps to keep the build hermetic on GitHub Pages CI.
// The output is a flat-color rounded square with a stylised "G2P" mark.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const PRIMARY = [0x24, 0x5c, 0x2f] // #245c2f
const CREAM = [0xf5, 0xf2, 0xe8]   // #f5f2e8
const LIME = [0xb7, 0xd9, 0x58]    // #b7d958

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function setPixel(buf, w, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= w) return
  const i = (y * w + x) * 4
  buf[i] = r
  buf[i + 1] = g
  buf[i + 2] = b
  buf[i + 3] = a
}

function fillRoundedRect(buf, w, h, x0, y0, x1, y1, radius, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // rounded corner test
      let inside = true
      const cx = x < x0 + radius ? x0 + radius : x >= x1 - radius ? x1 - radius - 1 : x
      const cy = y < y0 + radius ? y0 + radius : y >= y1 - radius ? y1 - radius - 1 : y
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > radius * radius) inside = false
      if (inside) setPixel(buf, w, x, y, color)
    }
  }
}

function fillRect(buf, w, x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) setPixel(buf, w, x, y, color)
  }
}

function fillCircle(buf, w, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r) setPixel(buf, w, x, y, color)
    }
  }
}

function strokeLine(buf, w, x0, y0, x1, y1, thickness, color) {
  // simple thick line via per-pixel distance
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy
  const minX = Math.min(x0, x1) - thickness
  const maxX = Math.max(x0, x1) + thickness
  const minY = Math.min(y0, y1) - thickness
  const maxY = Math.max(y0, y1) + thickness
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2))
      const px = x0 + t * dx
      const py = y0 + t * dy
      const ddx = x - px
      const ddy = y - py
      if (ddx * ddx + ddy * ddy <= thickness * thickness) setPixel(buf, w, x, y, color)
    }
  }
}

function drawIcon(size, opts = {}) {
  const { maskable = false } = opts
  const buf = Buffer.alloc(size * size * 4)

  // safe-zone padding for maskable icons (Android adaptive masks require ~10%)
  const padding = maskable ? Math.round(size * 0.1) : 0

  // background: full-bleed primary green for maskable, rounded square otherwise
  if (maskable) {
    fillRect(buf, size, 0, 0, size, size, PRIMARY)
  } else {
    const radius = Math.round(size * 0.22)
    fillRoundedRect(buf, size, size, 0, 0, size, size, radius, PRIMARY)
  }

  // mark geometry (mirrors public/favicon.svg, scaled to inner box)
  const inner = size - padding * 2
  const s = inner / 48 // original viewBox is 48
  const ox = padding
  const oy = padding

  // Top stroke of "G" arc — approximated with line for our raster
  strokeLine(
    buf,
    size,
    Math.round(ox + 13 * s),
    Math.round(oy + 16 * s),
    Math.round(ox + 33 * s),
    Math.round(oy + 16 * s),
    Math.max(2, Math.round(2 * s)),
    CREAM,
  )
  strokeLine(
    buf,
    size,
    Math.round(ox + 33 * s),
    Math.round(oy + 16 * s),
    Math.round(ox + 38 * s),
    Math.round(oy + 23 * s),
    Math.max(2, Math.round(2 * s)),
    CREAM,
  )
  strokeLine(
    buf,
    size,
    Math.round(ox + 38 * s),
    Math.round(oy + 23 * s),
    Math.round(ox + 33 * s),
    Math.round(oy + 30 * s),
    Math.max(2, Math.round(2 * s)),
    CREAM,
  )
  strokeLine(
    buf,
    size,
    Math.round(ox + 33 * s),
    Math.round(oy + 30 * s),
    Math.round(ox + 25 * s),
    Math.round(oy + 30 * s),
    Math.max(2, Math.round(2 * s)),
    CREAM,
  )

  // "2" lime stroke
  strokeLine(
    buf,
    size,
    Math.round(ox + 28 * s),
    Math.round(oy + 18 * s),
    Math.round(ox + 17 * s),
    Math.round(oy + 30 * s),
    Math.max(2, Math.round(2 * s)),
    LIME,
  )
  strokeLine(
    buf,
    size,
    Math.round(ox + 17 * s),
    Math.round(oy + 30 * s),
    Math.round(ox + 33 * s),
    Math.round(oy + 30 * s),
    Math.max(2, Math.round(2 * s)),
    LIME,
  )

  // accent dot
  fillCircle(buf, size, Math.round(ox + 15 * s), Math.round(oy + 16 * s), Math.max(2, Math.round(1.5 * s)), LIME)

  return encodePng(size, size, buf)
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size, maskable } of sizes) {
  const png = drawIcon(size, { maskable })
  writeFileSync(resolve(outDir, name), png)
  console.log(`wrote ${name} (${size}x${size}${maskable ? ' maskable' : ''})`)
}
