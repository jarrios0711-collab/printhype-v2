import { notFound } from 'next/navigation'
import { getOrderByTrackingToken } from '@/lib/tracking'
import { formatMoney } from '@/lib/costCalculator'
import TrackInvoiceButton from './TrackInvoiceButton'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Esperando inicio de producción',
  PRINTING: 'Imprimiendo...',
  SHIPPED: 'Listo para entregar',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

const STATUS_STEPS = ['PENDING', 'PRINTING', 'SHIPPED', 'COMPLETED']

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const order = await getOrderByTrackingToken(token)
  if (!order) notFound()

  const status = order.status || 'PENDING'
  const label = STATUS_LABEL[status] || status
  const cancelled = status === 'CANCELLED'
  const currentIndex = cancelled ? -1 : STATUS_STEPS.indexOf(status)
  const currency = 'ARS'

  return (
    <main className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FF6600_1px,transparent_1px)] [background-size:30px_30px]"></div>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center mb-8">
          <div className="text-2xl font-black tracking-tighter">
            <span className="text-neutral-300">PRINT</span>
            <span className="text-brand-orange">HYPE</span>
          </div>
          <div className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mt-1">Seguimiento de pedido</div>
        </div>

        <div className="glass-card w-full max-w-md rounded-2xl p-6 sm:p-8 border border-neutral-800/60">
          <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Pedido</div>
          <div className="text-xl font-black uppercase mt-1">{order.itemReference}</div>
          <div className="text-neutral-500 text-sm mt-1">Cliente: {order.customerName}</div>

          {/* Estado */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Estado</span>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-widest ${
                  cancelled
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : status === 'COMPLETED'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                }`}
              >
                {label}
              </span>
            </div>
            {!cancelled && (
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === 'COMPLETED' ? 'bg-green-500' : 'bg-brand-orange'}`}
                  style={{ width: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>
            )}
            {cancelled && <div className="text-sm text-red-500 mt-2">Este pedido fue cancelado.</div>}
          </div>

          {/* Timeline */}
          {!cancelled && (
            <div className="mt-6 space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIndex
                return (
                  <div key={step} className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        done ? 'border-brand-orange bg-brand-orange/20' : 'border-neutral-700'
                      }`}
                    >
                      {done && <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />}
                    </div>
                    <div className="pb-4">
                      <div className={`text-sm font-bold ${done ? 'text-neutral-200' : 'text-neutral-600'}`}>
                        {STATUS_LABEL[step]}
                      </div>
                      {i === currentIndex && (
                        <div className="text-[10px] text-brand-orange font-black uppercase tracking-widest mt-0.5">Actual</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Entrega y total */}
          <div className="mt-4 border-t border-neutral-800 pt-4 space-y-2">
            {order.deliveryDate && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Entrega estimada</span>
                <span className="font-bold">{new Date(order.deliveryDate).toLocaleDateString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Fecha del pedido</span>
              <span className="font-bold">{new Date(order.createdAt).toLocaleDateString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-base pt-1">
              <span className="text-neutral-500">Total</span>
              <span className="font-black text-brand-orange">{formatMoney(order.totalPrice, currency)}</span>
            </div>
          </div>

          {/* PDF */}
          <div className="mt-6">
            <TrackInvoiceButton order={order} currency={currency} />
          </div>
        </div>

        <div className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-8">
          Gestión de talleres 3D · PrintHype
        </div>
      </div>
    </main>
  )
}
