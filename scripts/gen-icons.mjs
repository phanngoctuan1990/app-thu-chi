import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(__dir, '../public/icon.svg'))

await sharp(svg).resize(192, 192).png().toFile(join(__dir, '../public/icon-192.png'))
console.log('✓ icon-192.png')

await sharp(svg).resize(512, 512).png().toFile(join(__dir, '../public/icon-512.png'))
console.log('✓ icon-512.png')

// Apple touch icon (180x180)
await sharp(svg).resize(180, 180).png().toFile(join(__dir, '../public/apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png')
