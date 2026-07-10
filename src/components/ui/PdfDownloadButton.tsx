'use client'

import { useState } from 'react'

/**
 * Botón de descarga PDF que carga jspdf + html2canvas dinámicamente.
 * Separado en su propio archivo para evitar que Turbopack analice fflate.
 */
export default function PdfDownloadButton({ order, settings, generateHtml }: {
  order: any
  settings: any
  generateHtml: (o: any, s: any) => string
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const jsPDFModule = await import('jspdf')
      const h2cModule = await import('html2canvas')
      const { default: jsPDF } = jsPDFModule
      const html2canvas = h2cModule.default

      const html = generateHtml(order, settings)
      const wrapper = document.createElement('div')
      wrapper.innerHTML = html
      wrapper.style.position = 'fixed'
      wrapper.style.left = '-9999px'
      wrapper.style.top = '0'
      wrapper.style.width = '210mm'
      wrapper.style.background = '#ffffff'
      wrapper.style.color = '#000000'
      document.body.appendChild(wrapper)

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })
      document.body.removeChild(wrapper)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Factura-${order.id?.slice(0, 8)}.pdf`)
    } catch (err) {
      console.warn('PDF fallback to HTML:', err)
      const html = generateHtml(order, settings)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3.5 bg-brand-orange text-black rounded-xl font-black text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          GENERANDO PDF...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          DESCARGAR FACTURA PDF
        </>
      )}
    </button>
  )
}
