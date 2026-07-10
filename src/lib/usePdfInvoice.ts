/**
 * Hook para generar PDF de factura usando jspdf + html2canvas.
 * Carga las dependencias dinámicamente solo en el cliente.
 */
export function usePdfInvoice() {
  const downloadPdf = async (order: any, settings: any, generateHtml: (order: any, settings: any) => string) => {
    try {
      // Dynamic imports — only on client side
      const jsPDFModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      const { default: jsPDF } = jsPDFModule
      const html2canvas = html2canvasModule.default

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
      return true
    } catch (err) {
      console.warn('PDF generation failed:', err)
      return false
    }
  }

  return { downloadPdf }
}
