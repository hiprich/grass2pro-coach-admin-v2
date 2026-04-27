#!/usr/bin/env node
// Generate PNG icons from the brand SVG using a tiny pure-JS rasterizer.
// We avoid external image deps to keep the build hermetic on GitHub Pages CI.
// The output is a flat-color rounded square with a stylised "G2P" mark
// (cream G, lime 2, cream P) that mirrors public/favicon.svg.

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

function setPixel(buf, w, h, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= w || y >= h) return
  const i = (y * w + x) * 4
  buf[i] = r
  buf[i + 1] = g
  buf[i + 2] = b
  buf[i + 3] = a
}

function fillRoundedRect(buf, w, h, x0, y0, x1, y1, radius, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let inside = true
      const cx = x < x0 + radius ? x0 + radius : x >= x1 - radius ? x1 - radius - 1 : x
      const cy = y < y0 + radius ? y0 + radius : y >= y1 - radius ? y1 - radius - 1 : y
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > radius * radius) inside = false
      if (inside) setPixel(buf, w, h, x, y, color)
    }
  }
}

function fillRect(buf, w, h, x0, y0, x1, y1, color) {
  const xs = Math.max(0, Math.floor(x0))
  const ys = Math.max(0, Math.floor(y0))
  const xe = Math.min(w, Math.ceil(x1))
  const ye = Math.min(h, Math.ceil(y1))
  for (let y = ys; y < ye; y++) {
    for (let x = xs; x < xe; x++) setPixel(buf, w, h, x, y, color)
  }
}

function fillCircle(buf, w, h, cx, cy, r, color) {
  const ri = Math.ceil(r)
  for (let y = cy - ri; y <= cy + ri; y++) {
    for (let x = cx - ri; x <= cx + ri; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r) setPixel(buf, w, h, x, y, color)
    }
  }
}

// Stroke a thick ring (annulus) optionally limited to an angle range.
// Angles are in radians, measured CCW from +x. Pass a full range for a complete ring.
function strokeArc(buf, w, h, cx, cy, radius, thickness, color, a0 = 0, a1 = Math.PI * 2) {
  const rOuter = radius + thickness / 2
  const rInner = radius - thickness / 2
  const rOuter2 = rOuter * rOuter
  const rInner2 = rInner * rInner
  const ri = Math.ceil(rOuter) + 1
  // normalize range so a1 >= a0
  while (a1 < a0) a1 += Math.PI * 2
  for (let y = Math.floor(cy - ri); y <= Math.ceil(cy + ri); y++) {
    for (let x = Math.floor(cx - ri); x <= Math.ceil(cx + ri); x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > rOuter2 || d2 < rInner2) continue
      let theta = Math.atan2(-dy, dx) // flip y so +y goes down (screen) but angle math stays standard
      if (theta < a0) theta += Math.PI * 2
      if (theta >= a0 && theta <= a1) setPixel(buf, w, h, x, y, color)
    }
  }
}

function strokeLine(buf, w, h, x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy || 1
  const t2 = (thickness / 2) * (thickness / 2)
  const t = thickness / 2
  const minX = Math.floor(Math.min(x0, x1) - t - 1)
  const maxX = Math.ceil(Math.max(x0, x1) + t + 1)
  const minY = Math.floor(Math.min(y0, y1) - t - 1)
  const maxY = Math.ceil(Math.max(y0, y1) + t + 1)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tt = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2))
      const px = x0 + tt * dx
      const py = y0 + tt * dy
      const ddx = x - px
      const ddy = y - py
      if (ddx * ddx + ddy * ddy <= t2) setPixel(buf, w, h, x, y, color)
    }
  }
  // round caps
  fillCircle(buf, w, h, x0, y0, t, color)
  fillCircle(buf, w, h, x1, y1, t, color)
}

function drawIcon(size, opts = {}) {
  const { maskable = false } = opts
  const buf = Buffer.alloc(size * size * 4)

  // safe-zone padding for maskable icons (Android adaptive masks require ~10%)
  const padding = maskable ? Math.round(size * 0.1) : 0

  // background: full-bleed primary green for maskable, rounded square otherwise
  if (maskable) {
    fillRect(buf, size, size, 0, 0, size, size, PRIMARY)
  } else {
    const radius = Math.round(size * 0.22)
    fillRoundedRect(buf, size, size, 0, 0, size, size, radius, PRIMARY)
  }

  // mark geometry — coordinates expressed in the source 48x48 viewBox, mapped to inner box
  const inner = size - padding * 2
  const s = inner / 48
  const ox = padding
  const oy = padding
  const px = (v) => ox + v * s
  const py = (v) => oy + v * s
  const sw = (v) => Math.max(2, v * s) // stroke width

  // baseline accent (subtle lime tint just under the mark)
  fillRoundedRect(
    buf,
    size,
    size,
    Math.round(px(9)),
    Math.round(py(36)),
    Math.round(px(39)),
    Math.round(py(37.5)),
    Math.max(1, Math.round(0.75 * s)),
    LIME,
  )

  // ---------- G (cream): thick ring with right-side opening + inner crossbar ----------
  // ring centered around (16.5, 23.5), radius ~7
  const gCx = px(16.5)
  const gCy = py(23.5)
  const gR = 7 * s
  const gStroke = sw(3.4)
  // open on the right (small gap) — draw arc from ~+15deg through +345deg (going CCW)
  // Using angle convention where 0 = +x (right), increasing CCW.
  // We want to leave a ~30deg gap on the right where the crossbar exits.
  strokeArc(buf, size, size, gCx, gCy, gR, gStroke, CREAM, 0.35, Math.PI * 2 - 0.35)
  // exit stub: short horizontal stroke from ring opening rightward then down a touch
  strokeLine(
    buf,
    size,
    size,
    px(16.5) + gR * Math.cos(0.35),
    gCy - gR * Math.sin(0.35),
    px(20),
    py(20),
    gStroke,
    CREAM,
  )
  // inner crossbar (the G's tongue)
  strokeLine(buf, size, size, px(15), py(24), px(20), py(24), sw(2.4), CREAM)

  // ---------- 2 (lime): top curve, diagonal, bottom bar ----------
  const twoStroke = sw(3)
  // top curve: small arc from (22.5, 19.5) through (25.5, 17) to (28, 19.5)
  strokeArc(buf, size, size, px(25.5), py(20), 3 * s, twoStroke, LIME, 0.2, Math.PI - 0.2)
  // diagonal slash from top-right of curve down-left to (22.5, 28)
  strokeLine(buf, size, size, px(28), py(20.2), px(22.5), py(28), twoStroke, LIME)
  // bottom bar
  strokeLine(buf, size, size, px(22.5), py(28), px(28.5), py(28), twoStroke, LIME)

  // ---------- P (cream): vertical stem + bowl (half-ring) ----------
  const pStroke = sw(3.4)
  // stem
  strokeLine(buf, size, size, px(33), py(16.5), px(33), py(31.5), pStroke, CREAM)
  // bowl: half-ring centered around (35, 20.5), radius 4, opening on the left
  // half-ring spans the right side: angles -PI/2 .. +PI/2 (top -> right -> bottom)
  strokeArc(buf, size, size, px(35), py(20.5), 4 * s, pStroke, CREAM, -Math.PI / 2, Math.PI / 2)
  // close the bowl back to the stem with two short horizontals (top and bottom of bowl)
  strokeLine(buf, size, size, px(33), py(16.5), px(35), py(16.5), pStroke, CREAM)
  strokeLine(buf, size, size, px(33), py(24.5), px(35), py(24.5), pStroke, CREAM)

  // ---------- accent ball (top-left, lime) ----------
  fillCircle(buf, size, size, px(10), py(12), Math.max(1.6, 1.8 * s), LIME)

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
