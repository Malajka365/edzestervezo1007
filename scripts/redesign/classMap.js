// Redesign migration helpers: legacy Tailwind colour classes -> semantic token classes.
// No JSX parser: className= attribute values are located with a small scanner that
// understands string literals, template literals (with nested ${...}) and comments.

const PREFIXES = 'bg|text|border|ring|divide|from|via|to|placeholder|fill|stroke|outline|shadow|accent'
const SHADED = 'slate|gray|zinc|neutral|stone|primary|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const UTILITY = `(${PREFIXES})-(?:(white|black)|(${SHADED})-(\\d{2,3}))(?:/(\\d+|\\[[^\\]\\s]+\\]))?`
const BARE_RE = new RegExp(`^${UTILITY}$`)
const VARIANT_CHARS = '[\\w\\[\\]&>*-]'
// Whole-source scan: the match may start with variant prefixes (hover:, lg:group-hover: ...)
const SCAN_RE = new RegExp(`(?<!${VARIANT_CHARS}|:)((?:${VARIANT_CHARS}+:)*)${UTILITY}(?![\\w-])`, 'g')

const EMOJI_RE = /\p{Extended_Pictographic}/gu
const EMOJI_EXCLUDED = new Set(['©', '®', '™']) // (c), (R), TM are plain text

const STATUS = {
  red: 'bad',
  green: 'ok',
  emerald: 'ok',
  yellow: 'warn',
  amber: 'warn',
  orange: 'warn',
}

/** Splits `hover:lg:bg-x/50` into its variant prefix (`hover:lg:`) and the bare utility. */
function splitVariants(token) {
  let depth = 0
  let cut = -1
  for (let i = 0; i < token.length; i++) {
    const ch = token[i]
    if (ch === '[') depth++
    else if (ch === ']') depth--
    else if (ch === ':' && depth === 0) cut = i
  }
  return [token.slice(0, cut + 1), token.slice(cut + 1)]
}

function parseBare(base) {
  const m = BARE_RE.exec(base)
  if (!m) return null
  const [, util, mono, shadedColor, shade, opacity] = m
  return { util, color: mono || shadedColor, shade: shade ? Number(shade) : null, opacity }
}

const SLATE_BG = { 900: 'bg', 950: 'bg', 800: 'surface', 700: 'surface-2', 600: 'surface-3', 500: 'surface-3' }
const SLATE_LINE = { 700: 'line', 600: 'line', 500: 'line-strong' }

function slateText(shade) {
  if (shade >= 100 && shade <= 300) return 'fg'
  if (shade === 400 || shade === 500) return 'muted'
  if (shade === 600 || shade === 700) return 'subtle'
  return null
}

function isSoftOpacity(opacity) {
  return /^\d+$/.test(opacity || '') && Number(opacity) <= 30
}

/** Returns the token class name (without prefix variants) or null. */
function mapBare({ util, color, shade, opacity }, hover) {
  const op = opacity ? `/${opacity}` : ''
  const withOp = (name) => `${util}-${name}${op}`

  if (color === 'slate') {
    if (util === 'bg') return SLATE_BG[shade] ? withOp(SLATE_BG[shade]) : null
    if (util === 'border' || util === 'divide') return SLATE_LINE[shade] ? withOp(SLATE_LINE[shade]) : null
    if (util === 'text') return slateText(shade) ? withOp(slateText(shade)) : null
    if (util === 'placeholder') return shade === 400 || shade === 500 ? withOp('subtle') : null
    return null
  }

  if (color === 'white') return util === 'text' ? withOp('fg') : null

  if (color === 'primary') {
    if (util === 'bg') {
      if (isSoftOpacity(opacity)) return 'bg-accent-soft'
      if (shade === 900) return withOp('accent-soft')
      if (shade === 500 || shade === 600) return withOp('accent')
      if (shade === 700) return withOp('accent-hover')
      return null
    }
    if (util === 'text') return shade >= 300 && shade <= 600 ? withOp('accent') : null
    if (util === 'border' || util === 'ring') return withOp('accent')
    return null
  }

  const status = STATUS[color]
  if (status) {
    if (util === 'text' || util === 'border' || util === 'ring') return withOp(status)
    if (util === 'bg') {
      if (isSoftOpacity(opacity)) return `bg-${status}-soft`
      if (shade === 900) return withOp(`${status}-soft`)
      if (shade === 500 || shade === 600) return withOp(status)
      if (shade === 700) return hover && !opacity ? `bg-${status}/90` : withOp(status)
      return null
    }
  }
  return null
}

/** Maps one legacy class (with optional variant prefixes / opacity) to a token class, or null. */
export function mapClass(cls) {
  const [prefix, base] = splitVariants(cls)
  const parsed = parseBare(base)
  if (!parsed) return null
  const hover = prefix.split(':').includes('hover')
  const mapped = mapBare(parsed, hover)
  return mapped ? prefix + mapped : null
}

/** True for a legacy colour class. `bg-black/<opacity>` is exempt: it is the overlay scrim (no token for it). */
function isLegacyColour(token) {
  const parsed = parseBare(splitVariants(token)[1])
  if (!parsed) return false
  return !(parsed.util === 'bg' && parsed.color === 'black' && parsed.opacity)
}

/**
 * Applies cb to every whitespace-separated token of a class string. Tokens glued to a
 * template `${}` (partial class names) are skipped via lead/trail flags.
 */
function mapTokens(content, cb, { leadOpen = false, trailOpen = false } = {}) {
  const re = /\S+/g
  const last = (() => {
    let end = -1
    for (const m of content.matchAll(re)) end = m.index + m[0].length
    return end
  })()
  return content.replace(re, (tok, offset) => {
    if (leadOpen && offset === 0) return tok
    if (trailOpen && offset + tok.length === last && last === content.length) return tok
    return cb(tok)
  })
}

/**
 * Scans a JS expression starting at index i (just after `{` or `${`) up to its matching `}`.
 * Rewrites string literal and template static parts through cb. Returns [output, indexOfClosingBrace].
 */
function scanExpression(src, i, cb) {
  let out = ''
  let depth = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== ch && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      out += ch + mapTokens(src.slice(i + 1, j), cb) + (src[j] === ch ? ch : '')
      i = src[j] === ch ? j + 1 : j
    } else if (ch === '`') {
      out += '`'
      i++
      let chunk = ''
      let leadOpen = false
      const flush = (trailOpen) => {
        out += mapTokens(chunk, cb, { leadOpen, trailOpen })
        chunk = ''
      }
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') {
          chunk += src.slice(i, i + 2)
          i += 2
        } else if (src[i] === '$' && src[i + 1] === '{') {
          flush(true)
          const [inner, end] = scanExpression(src, i + 2, cb)
          out += '${' + inner + '}'
          i = end + 1
          leadOpen = true
        } else {
          chunk += src[i++]
        }
      }
      flush(false)
      if (src[i] === '`') {
        out += '`'
        i++
      }
    } else if (ch === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i)
      const stop = end === -1 ? src.length : end
      out += src.slice(i, stop)
      i = stop
    } else if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      out += src.slice(i, stop)
      i = stop
    } else if (ch === '{') {
      depth++
      out += ch
      i++
    } else if (ch === '}') {
      if (depth === 0) return [out, i]
      depth--
      out += ch
      i++
    } else {
      out += ch
      i++
    }
  }
  return [out, i]
}

/** Rewrites every class token inside className="...", className={'...'}, className={`...`} and nested expressions. */
function transformClassNames(src, cb) {
  const attr = /(?<![\w$.-])className\s*=\s*/g
  let out = ''
  let pos = 0
  let m
  while ((m = attr.exec(src))) {
    const start = m.index + m[0].length
    if (start < pos) continue
    const ch = src[start]
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, start + 1)
      if (end === -1) continue
      out += src.slice(pos, start + 1) + mapTokens(src.slice(start + 1, end), cb)
      pos = end
      attr.lastIndex = end
    } else if (ch === '{') {
      const [inner, end] = scanExpression(src, start + 1, cb)
      out += src.slice(pos, start + 1) + inner
      pos = end
      attr.lastIndex = end
    }
  }
  return out + src.slice(pos)
}

/** Rewrites legacy colour classes inside className values only. `unmapped` lists the distinct ones left as-is. */
export function migrateSource(src) {
  const unmapped = []
  const code = transformClassNames(src, (tok) => {
    const mapped = mapClass(tok)
    if (mapped) return mapped
    if (isLegacyColour(tok) && !unmapped.includes(tok)) unmapped.push(tok)
    return tok
  })
  return { code, unmapped }
}

/** Distinct legacy colour classes, the `btn` class and emoji found in the source. */
export function findLegacy(src) {
  const found = new Set()
  for (const m of src.matchAll(SCAN_RE)) {
    if (isLegacyColour(splitVariants(m[0])[1])) found.add(m[0])
  }
  transformClassNames(src, (tok) => {
    if (tok === 'btn') found.add('btn')
    return tok
  })
  for (const m of src.matchAll(EMOJI_RE)) {
    if (!EMOJI_EXCLUDED.has(m[0])) found.add(m[0])
  }
  return [...found]
}
