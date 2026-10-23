// Shared by the redesign CLIs: expands CLI arguments into source files.
// A directory is walked recursively for .js/.jsx/.ts/.tsx files (node_modules skipped).
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_EXT = /\.(?:js|jsx|ts|tsx)$/

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(path)
      return SOURCE_EXT.test(entry.name) ? [path] : []
    })
}

/** Returns the list of files for the given arguments. Unreadable paths are returned as-is so the CLI reports them. */
export function expandPaths(args) {
  return args.flatMap((arg) => {
    try {
      return statSync(arg).isDirectory() ? walk(arg) : [arg]
    } catch {
      return [arg]
    }
  })
}
