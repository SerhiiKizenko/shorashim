// Generates the PWA icons from public/icon.svg with sharp. Run: pnpm icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))
const out = (name: string) => new URL(`../public/${name}`, import.meta.url).pathname

await sharp(svg).resize(192, 192).png().toFile(out('pwa-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('pwa-512.png'))
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'))
// Maskable: the safe zone is the inner 80 %, so render the mark smaller on a solid background.
const inner = await sharp(svg).resize(400, 400).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#a8c3b1' } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(out('pwa-512-maskable.png'))
console.log('icons written to public/')
