/**
 * SVG → PNG 아이콘 생성 스크립트
 * public/icons/ 에 PWA/APK용 PNG 아이콘을 모두 생성합니다
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(process.cwd())
const SVG_512 = readFileSync(resolve(ROOT, 'public/icons/icon-512.svg'))
const SVG_192 = readFileSync(resolve(ROOT, 'public/icons/icon-192.svg'))

const icons = [
  // PWA 필수
  { src: SVG_512, size: 512, out: 'public/icons/icon-512.png' },
  { src: SVG_192, size: 192, out: 'public/icons/icon-192.png' },
  // Android 적응형 아이콘 (maskable) - 배경 여백 포함
  { src: SVG_512, size: 512, out: 'public/icons/icon-512-maskable.png', maskable: true },
  // iOS Apple Touch Icon
  { src: SVG_192, size: 180, out: 'public/icons/apple-touch-icon.png' },
  // Favicon
  { src: SVG_192, size: 32,  out: 'public/favicon-32.png' },
  { src: SVG_192, size: 16,  out: 'public/favicon-16.png' },
]

for (const { src, size, out, maskable } of icons) {
  let pipeline = sharp(src).resize(size, size)

  if (maskable) {
    // maskable: 배경을 full-bleed로, 아이콘을 80% 중앙에 배치
    const inner = size * 0.8
    const offset = Math.round((size - inner) / 2)
    const resizedIcon = await sharp(src).resize(Math.round(inner), Math.round(inner)).toBuffer()
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 59, g: 91, b: 219, alpha: 1 }, // #3b5bdb
      },
    }).composite([{ input: resizedIcon, top: offset, left: offset }])
  }

  const buf = await pipeline.png().toBuffer()
  writeFileSync(resolve(ROOT, out), buf)
  console.log(`✅ ${out} (${size}×${size})`)
}

console.log('\n✅ 아이콘 생성 완료')
