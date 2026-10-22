// Téma token -> Tailwind szín. A --<név> változók src/styles/tokens.css-ben vannak.
const tok = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Figtree', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      colors: {
        'bg': tok('bg'),
        'surface': tok('surface'),
        'surface-2': tok('surface-2'),
        'surface-3': tok('surface-3'),
        'line': tok('line'),
        'line-strong': tok('line-strong'),
        'fg': tok('fg'),
        'muted': tok('muted'),
        'subtle': tok('subtle'),
        'accent': tok('accent'),
        'accent-hover': tok('accent-hover'),
        'accent-fg': tok('accent-fg'),
        'accent-soft': tok('accent-soft'),
        'ok': tok('ok'),
        'ok-soft': tok('ok-soft'),
        'warn': tok('warn'),
        'warn-soft': tok('warn-soft'),
        'bad': tok('bad'),
        'bad-soft': tok('bad-soft'),
        'on-status': tok('on-status'),
        't-strength': tok('t-strength'),
        't-ball': tok('t-ball'),
        't-tactic': tok('t-tactic'),
        't-match': tok('t-match'),
        't-rest': tok('t-rest'),
      },
    },
  },
  plugins: [],
}
