// Usage: npm run redesign:migrate -- <files or directories...>
// Rewrites legacy colour classes inside className values in place and prints
// `file: <unmapped classes>` for each file (classes needing a manual decision).
import { readFileSync, writeFileSync } from 'node:fs'
import { migrateSource } from './classMap.js'
import { expandPaths } from './files.mjs'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: npm run redesign:migrate -- <files or directories...>')
  process.exit(2)
}
const files = expandPaths(args)

let failed = false
for (const file of files) {
  try {
    const src = readFileSync(file, 'utf8')
    const { code, unmapped } = migrateSource(src)
    if (code !== src) writeFileSync(file, code)
    console.log(`${file}: ${unmapped.length ? unmapped.join(' ') : '(no unmapped classes)'}`)
  } catch (err) {
    failed = true
    console.error(`${file}: ${err.message}`)
  }
}
process.exit(failed ? 2 : 0)
