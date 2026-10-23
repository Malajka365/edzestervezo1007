import html2canvas from 'html2canvas'

/**
 * PDF-hez készít képet egy elemről. A rögzítés idejére az elem világos témát kap
 * (data-theme="light"), így a tokenek világos értékeket vesznek fel, és a PDF
 * mindkét témában olvasható, fehér hátterű marad.
 */
export async function captureForPdf(element, options = {}) {
  const previous = element.getAttribute('data-theme')
  element.setAttribute('data-theme', 'light')
  try {
    return await html2canvas(element, { backgroundColor: '#ffffff', ...options })
  } finally {
    if (previous === null) element.removeAttribute('data-theme')
    else element.setAttribute('data-theme', previous)
  }
}
