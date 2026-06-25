/**
 * 치매 모니터링 PWA 아이콘 생성 (SVG → PNG)
 * public/icons/monitoring-icon.svg → 192/512/512-maskable/apple-touch
 * 실행: node scripts/gen-monitoring-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(process.cwd())
const SVG = readFileSync(resolve(ROOT, 'public/icons/monitoring-icon.svg'))
const TEAL = { r: 13, g: 148, b: 136, alpha: 1 } // #0d9488

const icons = [
  { size: 192, out: 'public/icons/monitoring-icon-192.png' },
  { size: 512, out: 'public/icons/monitoring-icon-512.png' },
  { size: 512, out: 'public/icons/monitoring-icon-512-maskable.png', maskable: true },
  { size: 180, out: 'public/icons/monitoring-apple-touch.png' },
]

for (const { size, out, maskable } of icons) {
  let pipeline = sharp(SVG).resize(size, size)

  if (maskable) {
    const inner = Math.round(size * 0.8)
    const offset = Math.round((size - inner) / 2)
    const resizedIcon = await sharp(SVG).resize(inner, inner).toBuffer()
    pipeline = sharp({
      create: { width: size, height: size, channels: 4, background: TEAL },
    }).composite([{ input: resizedIcon, top: offset, left: offset }])
  }

  const buf = await pipeline.png().toBuffer()
  writeFileSync(resolve(ROOT, out), buf)
  console.log(`✅ ${out} (${size}×${size})`)
}

console.log('\n✅ 모니터링 아이콘 생성 완료')
