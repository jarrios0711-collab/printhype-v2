type ClassValue = string | number | boolean | undefined | null | { [key: string]: boolean | undefined }

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .filter(Boolean)
    .map(input => {
      if (typeof input === 'string') return input
      if (typeof input === 'number') return String(input)
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k)
          .join(' ')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

// ──────────────────────────────────────────
// WhatsApp
// ──────────────────────────────────────────

/** Construye URL de WhatsApp para contacto directo con el cliente */
export function getWaUrl(phone: string, name: string, project: string): string {
  if (!phone) return '#'
  let c = phone.replace(/\D/g, '')
  if (c.startsWith('0')) c = c.substring(1)
  if (!c.startsWith('549') && !c.startsWith('54') && c.length === 10) c = '549' + c
  if (c.startsWith('54') && !c.startsWith('549')) c = '549' + c.substring(2)
  const msg = `Hola ${name}, te contacto de JR3D sobre tu pedido de ${project}.`
  return `https://wa.me/${c}?text=${encodeURIComponent(msg)}`
}

/** Construye URL de WhatsApp con factura */
export function getWaInvoiceUrl(
  phone: string,
  customerName: string,
  totalPrice: number,
  status: string,
  orderId: string,
  currency: string
): string {
  if (!phone) return '#'
  let c = phone.replace(/\D/g, '')
  if (c.startsWith('0')) c = c.substring(1)
  if (!c.startsWith('549') && !c.startsWith('54') && c.length === 10) c = '549' + c
  if (c.startsWith('54') && !c.startsWith('549')) c = '549' + c.substring(2)
  const symbol = currency === 'USD' ? 'US$' : '$'
  const invoiceUrl = '/dashboard/orders/' + orderId
  const msg = `🧾 *FACTURA PrintHype - JR3D*\n\nCliente: ${customerName}\nTotal: ${symbol}${totalPrice.toLocaleString()}\nEstado: ${status}\n\nPodés ver tu factura acá:\n${invoiceUrl}`
  return `https://wa.me/${c}?text=${encodeURIComponent(msg)}`
}

// ──────────────────────────────────────────
// Moneda
// ──────────────────────────────────────────

/** Formatea un número como moneda local (ARS/USD) */
export function formatCurrency(value: number, currency: string = 'ARS'): string {
  const symbol = currency === 'USD' ? 'US$' : '$'
  return `${symbol}${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

// ──────────────────────────────────────────
// Costos de impresión 3D
// ──────────────────────────────────────────

/** Calcula desglose de costos de una orden (material, energía, mano de obra) */
export function calcOrderCosts(
  weightGrams: number | null | undefined,
  kwhPrice?: number,
  laborHourPrice?: number
): { material: number; energy: number; labor: number; totalCost: number } {
  const material = weightGrams ? Math.round(weightGrams * 1.24 * 0.025) : 0
  const energy = kwhPrice ? Math.round(kwhPrice * 3.5) : 420
  const labor = laborHourPrice ? Math.round(laborHourPrice) : 800
  const totalCost = material + energy + labor
  return { material, energy, labor, totalCost }
}

/** Calcula el margen porcentual entre precio de venta y costo */
export function calcMargin(totalPrice: number, totalCost: number): string {
  return totalPrice > 0 && totalCost > 0
    ? ((totalPrice - totalCost) / totalPrice * 100).toFixed(1)
    : '0.0'
}
