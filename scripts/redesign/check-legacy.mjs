// Usage: npm run redesign:check -- <files...>
// Prints legacy colour classes, the `btn` class and emoji found in each file.
// Exits 1 if anything is found (or a file cannot be read).
import { readFileSync } from 'node:fs'
import { findLegacy } from './classMap.js'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: npm run redesign:check -- <files...>')
  process.exit(2)
}

let bad = false
for (const file of files) {
  try {
    const found = findLegacy(readFileSync(file, 'utf8'))
    if (found.length) {
      bad = true
      console.log(`${file}: ${found.join(' ')}`)
    }
  } catch (err) {
    bad = true
    console.error(`${file}: ${err.message}`)
  }
}
process.exit(bad ? 1 : 0)
