import toast from 'react-hot-toast'

// Shared jsPDF + autoTable export helper.
//
// Encapsulates the common document setup, header, table styling, save and
// error handling that were previously copy-pasted across the export pages.
// jspdf / jspdf-autotable are imported dynamically INSIDE this function so the
// libraries still load only on demand (lazy), exactly as before.
//
// Page-specific data shaping (building `columns`, `rows`, `filename`) stays in
// the calling page. For richer exports (e.g. an embedded chart image or extra
// text between the header and the table) pass an async `beforeTable(doc)`
// callback and an explicit `startY`.
export const exportTablePdf = async ({
  orientation = 'portrait',
  title,
  // Lines rendered under the title at font size 10 (e.g. subtitle, date).
  subtitles = [],
  columns,
  rows,
  startY = 35,
  headStyles = {},
  bodyStyles = {},
  columnStyles = {},
  alternateRowStyles = { fillColor: [245, 245, 245] },
  didParseCell,
  filename,
  emptyMessage = 'Nincs exportálható adat!',
  checkEmpty = true,
  beforeTable,
}) => {
  try {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF(orientation === 'landscape' ? 'landscape' : undefined)

    // Title
    doc.setFontSize(18)
    doc.text(title, 14, 15)

    // Subtitle / meta lines
    doc.setFontSize(10)
    subtitles.forEach((line, i) => {
      doc.text(line, 14, 22 + i * 6)
    })

    if (checkEmpty && (!rows || rows.length === 0)) {
      console.error('No data to export')
      toast.error(emptyMessage)
      return
    }

    // Optional custom content (chart image, stats, extra pages) before the table.
    if (beforeTable) {
      await beforeTable(doc)
    }

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        fontStyle: 'bold',
        ...headStyles,
      },
      bodyStyles: {
        ...bodyStyles,
      },
      columnStyles,
      alternateRowStyles,
      ...(didParseCell ? { didParseCell } : {}),
    })

    // Save PDF
    doc.save(filename)

    console.log('PDF exported successfully:', filename)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    toast.error('Hiba történt a PDF exportálás során!')
  }
}
