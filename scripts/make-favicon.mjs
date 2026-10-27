import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.resolve(
  'C:/Users/HP/.cursor/projects/c-Users-HP-Documents-Projects-hospitality-mgt-app/assets/Hospitality_Manager_Logo-13ee007a-bba2-4df7-97e9-97c2ca84e23c.png',
)
const appDir = path.join(root, 'app')

function buildIco(images) {
  const count = images.length
  let offset = 6 + count * 16
  const entries = images.map((image) => {
    const entry = { ...image, offset, length: image.png.length }
    offset += image.png.length
    return entry
  })

  const buffer = Buffer.alloc(offset)
  buffer.writeUInt16LE(0, 0)
  buffer.writeUInt16LE(1, 2)
  buffer.writeUInt16LE(count, 4)

  entries.forEach((entry, index) => {
    const base = 6 + index * 16
    const dimension = entry.size >= 256 ? 0 : entry.size
    buffer.writeUInt8(dimension, base)
    buffer.writeUInt8(dimension, base + 1)
    buffer.writeUInt8(0, base + 2)
    buffer.writeUInt8(0, base + 3)
    buffer.writeUInt16LE(1, base + 4)
    buffer.writeUInt16LE(32, base + 6)
    buffer.writeUInt32LE(entry.length, base + 8)
    buffer.writeUInt32LE(entry.offset, base + 12)
    entry.png.copy(buffer, entry.offset)
  })

  return buffer
}

const trimmed = await sharp(src).trim({ threshold: 18 }).png().toBuffer({ resolveWithObject: true })
const { width, height } = trimmed.info
const pad = Math.round(Math.max(width, height) * 0.08)
const side = Math.max(width, height) + pad * 2

const square = await sharp({
  create: {
    width: side,
    height: side,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([
    {
      input: trimmed.data,
      left: Math.round((side - width) / 2),
      top: Math.round((side - height) / 2),
    },
  ])
  .png()
  .toBuffer()

async function sized(size) {
  return sharp(square).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer()
}

const [icon, apple, png48, png32, png16] = await Promise.all([
  sized(512),
  sized(180),
  sized(48),
  sized(32),
  sized(16),
])

fs.writeFileSync(path.join(appDir, 'icon.png'), icon)
fs.writeFileSync(path.join(appDir, 'apple-icon.png'), apple)
fs.writeFileSync(
  path.join(appDir, 'favicon.ico'),
  buildIco([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
    { size: 48, png: png48 },
  ]),
)

console.log(JSON.stringify({ sourceTrimmed: { width, height }, square: side }))
