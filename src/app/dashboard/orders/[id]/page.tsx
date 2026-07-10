'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  User,
  Phone,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  MoreVertical,
  Layers,
  Zap,
  DollarSign,
  Box,
  Printer as PrinterIcon,
  Loader2,
  BrainCircuit
} from 'lucide-react'
import { cn, getWaUrl, calcOrderCosts, calcMargin, formatCurrency } from '@/lib/utils'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Tooltip from '@/components/ui/Tooltip'
import { generateInvoiceHtml } from '@/lib/invoice'
import dynamic from 'next/dynamic'

// Cargar el botón PDF solo en el cliente para evitar errores con fflate/node
const PdfDownloadButton = dynamic(() => import('@/components/ui/PdfDownloadButton'), { ssr: false })

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const fetchOrder = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (!data.error) setOrder(data)
    } catch (err) {
      console.error('Error fetching order:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [id])

  const priorityColors = {
    NORMAL: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    HIGH: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
    URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const userWebhook = typeof window !== 'undefined' ? localStorage.getItem('ph_user_webhook') || '' : ''
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(userWebhook ? { 'x-webhook-url': userWebhook } : {}) },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (!data.error) {
        setOrder(data)
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const [printers, setPrinters] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    fetch('/api/printers').then(r => r.json()).then(data => { if (!data.error) setPrinters(data) }).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then(data => { if (!data.error) setSettings(data) }).catch(() => {})
  }, [])

  const statusProgress: Record<string, number> = {
    PENDING: 0, PRINTING: 45, SHIPPED: 85, COMPLETED: 100, CANCELLED: 0,
  }

  const statusLabel: Record<string, string> = {
    PENDING: 'Esperando inicio de producción',
    PRINTING: 'Imprimiendo...',
    SHIPPED: 'Listo para entregar',
    COMPLETED: 'Finalizado',
    CANCELLED: 'Cancelado',
  }

  const calcEstimatedDate = (createdAt: string, status: string) => {
    if (status === 'COMPLETED') return 'Entregado'
    const created = new Date(createdAt)
    const eta = new Date(created)
    eta.setDate(eta.getDate() + 3)
    return eta.toLocaleDateString('es-AR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  }

  const orderCosts = calcOrderCosts(order?.weightGrams, settings?.kwhPrice, settings?.laborHourPrice)
  const orderMargin = calcMargin(order?.totalPrice || 0, orderCosts.totalCost)

  const fmt = (n: number) => formatCurrency(n, settings?.currency || 'ARS')

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
      <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Cargando detalles de orden...</p>
    </div>
  )

  if (!order) return (
    <div className="p-20 text-center">
      <p className="text-neutral-500">No se encontró la orden.</p>
      <Link href="/dashboard/orders" className="text-brand-orange text-xs font-bold uppercase mt-4 block">Volver</Link>
    </div>
  )

  const statusColors = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    PRINTING: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
    SHIPPED: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
    COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'PENDING': return <Clock size={14} />;
      case 'PRINTING': return <Zap size={14} className="animate-pulse" />;
      case 'SHIPPED': return <Truck size={14} />;
      case 'COMPLETED': return <CheckCircle2 size={14} />;
      default: return <AlertCircle size={14} />;
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Breadcrumb crumbs={[
          { label: 'Pedidos', href: '/dashboard/orders' },
          { label: order ? order.customerName : 'Detalle' },
        ]} />

        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black tracking-tighter text-white">{order.id.slice(0, 12)}...</h1>
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border",
                statusColors[order.status as keyof typeof statusColors]
              )}>
                <StatusIcon status={order.status} />
                {order.status}
              </div>
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border",
                priorityColors[order.priority as keyof typeof priorityColors] || priorityColors.NORMAL
              )}>
                {order.priority}
              </div>
              {order.stockDeducted && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-green-500/10 text-green-500 border border-green-500/20">
                  📦 STOCK DESCONTADO
                </div>
              )}
            </div>
            <p className="text-neutral-500 text-sm font-medium">
              Pedido creado el {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex gap-3">
            {order.customerPhone && (
              <Tooltip content="Enviar factura por WhatsApp al cliente">
                <a
                  href={(() => {
                    let c = order.customerPhone.replace(/\D/g, '')
                    if (c.startsWith('0')) c = c.substring(1)
                    if (!c.startsWith('549') && !c.startsWith('54') && c.length === 10) c = '549' + c
                    if (c.startsWith('54') && !c.startsWith('549')) c = '549' + c.substring(2)
                    const invoiceUrl = window.location.origin + '/dashboard/orders/' + order.id
                    const symbol = settings?.currency === 'USD' ? 'US$' : '$'
                    const msg = '🧾 *FACTURA PrintHype - JR3D*\n\nCliente: ' + order.customerName + '\nTotal: ' + symbol + order.totalPrice.toLocaleString() + '\nEstado: ' + order.status + '\n\nPodés ver y descargar tu factura acá:\n' + invoiceUrl + '\n\n¡Gracias por confiar en JR3D! 🚀'
                    return 'https://wa.me/' + c + '?text=' + encodeURIComponent(msg)
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs font-black hover:bg-green-500/20 transition-all text-green-500 flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  FACTURA WHATSAPP
                </a>
              </Tooltip>
            )}
            <Tooltip content="Descargar comprobante del pedido en PDF">
              <PdfDownloadButton
                order={order}
                settings={settings}
                generateHtml={generateInvoiceHtml}
              />
            </Tooltip>
            <div className="relative group">
              <Tooltip content="Cambiar el estado de producción del pedido">
                <button
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,102,0,0.3)] flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'ACTUALIZAR ESTADO'}
                </button>
              </Tooltip>
              
              <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-2xl p-2 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {[
                  { key: 'PENDING', label: 'Pendiente', desc: 'Esperando inicio de producción' },
                  { key: 'PRINTING', label: 'En Imprenta', desc: 'Actualmente en proceso de impresión' },
                  { key: 'SHIPPED', label: 'Para Enviar', desc: 'Listo para entrega al cliente' },
                  { key: 'COMPLETED', label: 'Completado', desc: 'Pedido finalizado y entregado' },
                  { key: 'CANCELLED', label: 'Cancelado', desc: 'Pedido cancelado' },
                ].map((s) => (
                  <Tooltip key={s.key} content={s.desc} position="left">
                    <button
                      onClick={() => handleUpdateStatus(s.key)}
                      className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    >
                      {s.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Production Status Card */}
          <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-10">
                <PrinterIcon size={120} />
             </div>
             
             <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-6">Estado de Producción</h2>
             
             <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-4xl font-black text-white">{statusProgress[order.status as keyof typeof statusProgress] || 0}%</span>
                    <p className="text-brand-orange text-[10px] font-black tracking-widest uppercase">{statusLabel[order.status as keyof typeof statusLabel] || 'Pendiente'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Finalización Estimada</span>
                    <span className="text-sm font-bold text-white">{calcEstimatedDate(order.createdAt, order.status)}</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-brand-orange to-orange-400 transition-all duration-1000 shadow-[0_0_20px_rgba(255,102,0,0.4)]"
                    style={{ width: `${statusProgress[order.status as keyof typeof statusProgress] || 0}%` }}>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-2">Impresora</span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-orange/20 flex items-center justify-center text-brand-orange">
                        <PrinterIcon size={16} />
                      </div>
                      <span className="text-sm font-bold text-white">{printers[0]?.name || 'Sin asignar'}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-2">Consumo Est.</span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                        <Box size={16} />
                      </div>
                      <span className="text-sm font-bold text-white">{order.weightGrams || '0'}g de Filamento</span>
                    </div>
                  </div>
                </div>

                <Link
                    href="/dashboard/ai-lab"
                    className="mt-4 flex items-center justify-center gap-2 py-2.5 bg-brand-orange/10 border border-brand-orange/20 rounded-xl text-[10px] font-black text-brand-orange hover:bg-brand-orange/20 transition-all"
                >
                    <BrainCircuit size={14} /> ANALIZAR STL EN AI LAB
                </Link>
             </div>
          </div>

          {/* Items Table */}
          <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl overflow-hidden backdrop-blur-md">
            <div className="p-6 border-b border-neutral-900 flex justify-between items-center">
              <h2 className="text-xs font-black text-white uppercase tracking-widest">Items del Pedido</h2>
              <span className="px-3 py-1 bg-neutral-900 rounded-lg text-[10px] font-bold text-neutral-400 italic">
                {order.items.length} items totales
              </span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-neutral-900">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Producto / Proyecto</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500 text-center">Cant.</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500 text-right">Precio Unit.</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {order.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-500">
                          <Package size={20} />
                        </div>
                        <span className="font-bold text-sm text-white tracking-tight">{item.projectName}</span>
                      </div>
                    </td>
                    <td className="p-5 text-center text-sm font-bold text-neutral-300">
                      {item.quantity}
                    </td>
                    <td className="p-5 text-right font-bold text-neutral-400 text-sm">
                      {fmt(item.price)}
                    </td>
                    <td className="p-5 text-right font-black text-white text-sm">
                      {fmt(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5 font-black">
                  <td colSpan={3} className="p-6 text-right text-xs uppercase text-neutral-500 tracking-widest">Total del Pedido</td>
                  <td className="p-6 text-right text-2xl text-brand-orange">{fmt(order.totalPrice)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right Column: Customer & AI Insights */}
        <div className="space-y-8">
          {/* Customer Info */}
          <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 backdrop-blur-md">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-6">Información del Cliente</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center border border-white/5">
                  <User size={20} className="text-brand-orange" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest block mb-1">Nombre Completo</span>
                  <span className="text-sm font-bold text-white tracking-tight">{order.customerName}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center border border-white/5">
                  <Phone size={20} className="text-brand-cyan" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest block mb-1">WhatsApp / Contacto</span>
                  {order.customerPhone ? (
                     <a 
                        href={getWaUrl(order.customerPhone, order.customerName, order.items?.[0]?.projectName || 'PrintHype')}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all"
                     >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        ENVIAR MENSAJE
                     </a>
                  ) : (
                     <span className="text-sm font-bold text-white tracking-tight">No registrado</span>
                  )}
                </div>
              </div>

              <Tooltip content="Ver todas las órdenes anteriores de este cliente">
                <button
                  onClick={() => window.location.href = `/dashboard/orders?search=${encodeURIComponent(order?.customerName || '')}`}
                  className="w-full py-3 bg-neutral-900 border border-white/5 rounded-xl text-[10px] font-black text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all tracking-widest uppercase"
                >
                  Ver Historial de Compras
                </button>
              </Tooltip>
            </div>
          </div>

          {/* AI ROI Analysis */}
          <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 border border-brand-orange/30 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Zap size={80} className="text-brand-orange" />
            </div>
            
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-md bg-brand-orange flex items-center justify-center">
                <Zap size={12} className="text-black" />
              </div>
              <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Análisis de ROI (IA)</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-bold">Costo Material</span>
                <span className="text-white font-bold">{fmt(orderCosts.material)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-bold">Energía Est.</span>
                <span className="text-white font-bold">{fmt(orderCosts.energy)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-bold">Mano de Obra</span>
                <span className="text-white font-bold">{fmt(orderCosts.labor)}</span>
              </div>
              <div className="h-px bg-white/5 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-brand-orange uppercase">Margen Neto</span>
                <span className="text-lg font-black text-white">{orderMargin}%</span>
              </div>
              
              <div className="p-3 bg-brand-orange/10 rounded-xl border border-brand-orange/20 mt-4">
                 <p className="text-[10px] text-brand-orange leading-relaxed italic font-medium">
                   "Este pedido tiene un ROI superior al promedio del taller. Recomendamos priorizar para despacho inmediato."
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
