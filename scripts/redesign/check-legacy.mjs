// Usage: npm run redesign:check -- <files or directories...>
// Prints legacy colour classes, legacy component classes (btn, card ...) and emoji found in each file.
// Exits 1 if anything is found (or a file cannot be read).
import { readFileSync } from 'node:fs'
import { findLegacy } from './classMap.js'
import { expandPaths } from './files.mjs'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: npm run redesign:check -- <files or directories...>')
  process.exit(2)
}
const files = expandPaths(args)

let bad = false
let filesWithFindings = 0
let findings = 0
for (const file of files) {
  try {
    const found = findLegacy(readFileSync(file, 'utf8'))
    if (found.length) {
      bad = true
      filesWithFindings++
      findings += found.length
      console.log(`${file}: ${found.join(' ')}`)
    }
  } catch (err) {
    bad = true
    console.error(`${file}: ${err.message}`)
  }
}
if (filesWithFindings) console.error(`${filesWithFindings} of ${files.length} file(s) with findings (${findings} total)`)
process.exit(bad ? 1 : 0)
