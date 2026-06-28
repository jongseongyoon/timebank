/**
 * 토마토의료기 PWA 아이콘 생성 (SVG → PNG)
 * 실행: node scripts/gen-tomato-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(process.cwd())
const SVG = readFileSync(resolve(ROOT, 'public/icons/tomato-icon.svg'))

const icons = [
  { size: 192, out: 'public/icons/tomato-icon-192.png' },
  { size: 512, out: 'public/icons/tomato-icon-512.png' },
  { size: 512, out: 'public/icons/tomato-icon-512-maskable.png', maskable: true },
  { size: 180, out: 'public/icons/tomato-apple-touch.png' },
]

for (const { size, out, maskable } of icons) {
  let pipeline = sharp(SVG).resize(size, size)
  if (maskable) {
    const inner = Math.round(size * 0.8)
    const offset = Math.round((size - inner) / 2)
    const resized = await sharp(SVG).resize(inner, inner).toBuffer()
    pipeline = sharp({
      create: { width: size, height: size, channels: 4, background: { r: 220, g: 38, b: 38, alpha: 1 } },
    }).composite([{ input: resized, top: offset, left: offset }])
  }
  const buf = await pipeline.png().toBuffer()
  writeFileSync(resolve(ROOT, out), buf)
  console.log(`✓ ${out} (${size}×${size})`)
}
console.log('토마토 아이콘 생성 완료')
