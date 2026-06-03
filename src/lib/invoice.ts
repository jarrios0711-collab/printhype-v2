export interface OrderForInvoice {
    id: string
    customerName: string
    customerPhone?: string
    status: string
    priority: string
    totalPrice: number
    createdAt: string
    weightGrams?: number | null
    stockDeducted?: boolean
    items: Array<{
        id: string
        projectName: string
        quantity: number
        price: number
    }>
}

export interface SettingsForInvoice {
    kwhPrice?: number
    laborHourPrice?: number
    profitMargin?: number
    currency?: string
}

function calcCosts(order: OrderForInvoice, settings?: SettingsForInvoice | null) {
    const material = order.weightGrams
        ? Math.round(order.weightGrams * 1.24 * 0.025)
        : 0
    const energy = settings?.kwhPrice
        ? Math.round(settings.kwhPrice * 3.5)
        : 420
    const labor = settings?.laborHourPrice
        ? Math.round(settings.laborHourPrice)
        : 800
    const totalCost = material + energy + labor
    const margin = order.totalPrice > 0 && totalCost > 0
        ? ((order.totalPrice - totalCost) / order.totalPrice * 100).toFixed(1)
        : '0.0'
    return { material, energy, labor, totalCost, margin }
}

export function generateInvoiceHtml(order: OrderForInvoice, settings?: SettingsForInvoice | null): string {
    const costs = calcCosts(order, settings)
    const date = new Date(order.createdAt).toLocaleDateString('es-AR', {
        year: 'numeric', month: 'long', day: 'numeric',
    })
    const items = order.items?.length
        ? order.items
        : [{ id: 'item-1', projectName: 'Pedido', quantity: 1, price: order.totalPrice }]
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Factura - PrintHype</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #fafafa; color: #111; padding: 40px; }
  .invoice { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: linear-gradient(135deg, #ff7a00 0%, #ff5500 100%); padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { color: #fff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
  .header .brand { color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
  .header .badge { background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .meta { padding: 24px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; background: #fefefe; }
  .meta-block h3 { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
  .meta-block p { font-size: 14px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 0; }
  thead th { background: #f5f5f5; padding: 14px 40px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; font-weight: 700; letter-spacing: 0.5px; }
  tbody td { padding: 16px 40px; border-bottom: 1px solid #eee; font-size: 14px; }
  tbody tr:last-child td { border-bottom: none; }
  .item-name { font-weight: 600; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .totals { padding: 24px 40px; background: #fefefe; border-top: 1px solid #eee; }
  .totals .row { display: flex; justify-content: flex-end; gap: 80px; }
  .totals .col { text-align: right; }
  .totals .label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; letter-spacing: 0.5px; }
  .totals .value { font-size: 18px; font-weight: 900; }
  .totals .total-value { color: #ff7a00; font-size: 28px; }
  .costs { margin: 24px 40px; padding: 20px; background: #fafafa; border-radius: 12px; border: 1px solid #eee; }
  .costs h3 { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; }
  .costs .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .costs .item { }
  .costs .item .label { font-size: 10px; color: #999; }
  .costs .item .value { font-size: 15px; font-weight: 700; }
  .costs .margin { margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
  .costs .margin .label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #ff7a00; }
  .costs .margin .value { font-size: 20px; font-weight: 900; color: #111; }
  .footer { text-align: center; padding: 24px 40px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; }
  .footer strong { color: #ff7a00; }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div>
      <h1>PrintHype</h1>
      <div class="brand">JR3D — Gestión de Taller 3D</div>
    </div>
    <div class="badge">#${order.id.slice(0, 8).toUpperCase()}</div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <h3>Cliente</h3>
      <p>${order.customerName}</p>
      ${order.customerPhone ? `<p style="font-size:12px;color:#888;margin-top:2px">${order.customerPhone}</p>` : ''}
    </div>
    <div class="meta-block" style="text-align:right">
      <h3>Fecha</h3>
      <p>${date}</p>
      <p style="font-size:11px;color:#888;margin-top:2px">Estado: ${order.status}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto / Proyecto</th>
        <th class="text-center">Cant.</th>
        <th class="text-right">Precio Unit.</th>
        <th class="text-right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td class="item-name">${item.projectName}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">$${item.price.toLocaleString()}</td>
          <td class="text-right">$${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <div class="col">
        <div class="label">Subtotal</div>
        <div class="value">$${subtotal.toLocaleString()}</div>
      </div>
      <div class="col">
        <div class="label">Total</div>
        <div class="value total-value">$${order.totalPrice.toLocaleString()}</div>
      </div>
    </div>
  </div>

  <div class="costs">
    <h3>📊 Desglose de Costos (estimación IA)</h3>
    <div class="grid">
      <div class="item">
        <div class="label">Material</div>
        <div class="value">$${costs.material.toLocaleString()}</div>
      </div>
      <div class="item">
        <div class="label">Energía</div>
        <div class="value">$${costs.energy.toLocaleString()}</div>
      </div>
      <div class="item">
        <div class="label">Mano de Obra</div>
        <div class="value">$${costs.labor.toLocaleString()}</div>
      </div>
      <div class="item">
        <div class="label">Costo Total</div>
        <div class="value">$${costs.totalCost.toLocaleString()}</div>
      </div>
    </div>
    <div class="margin">
      <span class="label">Margen Neto</span>
      <span class="value">${costs.margin}%</span>
    </div>
  </div>

  <div class="footer">
    Generado por <strong>PrintHype</strong> — Sistema de Gestión JR3D<br>
    ${new Date().toLocaleString('es-AR')}
  </div>
</div>
</body>
</html>`
}
