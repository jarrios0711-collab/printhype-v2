'use client'

import dynamic from 'next/dynamic'
import { generateInvoiceHtml, type OrderForInvoice } from '@/lib/invoice'
import type { PublicOrder } from '@/lib/tracking'

const PdfDownloadButton = dynamic(() => import('@/components/ui/PdfDownloadButton'), { ssr: false })

export default function TrackInvoiceButton({ order, currency }: { order: PublicOrder; currency: string }) {
  const invoiceOrder: OrderForInvoice = {
    id: order.id,
    customerName: order.customerName,
    status: order.status,
    priority: order.priority,
    totalPrice: order.totalPrice,
    createdAt: order.createdAt,
    items: [{ id: order.id, projectName: order.itemReference, quantity: 1, price: order.totalPrice }],
  }

  return (
    <PdfDownloadButton
      order={invoiceOrder}
      settings={{ currency }}
      generateHtml={generateInvoiceHtml}
    />
  )
}
