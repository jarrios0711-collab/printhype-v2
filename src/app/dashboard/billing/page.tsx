'use client'

import { useEffect, useState } from 'react'
import { Loader2, CreditCard, Check, X } from 'lucide-react'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/costCalculator'
import { PLANS, PLAN_IDS, type PlanId } from '@/config/plans'

interface PlanState {
  plan: PlanId
  name: string
  priceARS: number
  limits: { maxOrders: number | null; maxInventoryItems: number | null; aiLab: boolean; tracking: boolean }
  currentUsage: { orders: number; inventory: number }
  periodEnd: string | null
  status: string
  paymentsEnabled: boolean
}

function BillingContent() {
  const { showToast } = useToast()
  const [state, setState] = useState<PlanState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<PlanId | 'cancel' | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/billing/plan')
      if (res.ok) setState(await res.json())
    } catch {
      showToast('Error al cargar tu plan', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subscribe = async (plan: PlanId) => {
    if (plan === 'FREE') return
    setBusy(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Error al iniciar el pago', 'error')
        return
      }
      if (data.initPoint) {
        window.location.href = data.initPoint
      } else {
        showToast('Checkout creado', 'info')
        load()
      }
    } catch {
      showToast('Error al iniciar el pago', 'error')
    } finally {
      setBusy(null)
    }
  }

  const cancel = async () => {
    setBusy('cancel')
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (res.ok) {
        showToast('Suscripción cancelada al final del período', 'success')
        load()
      } else {
        showToast('Error al cancelar', 'error')
      }
    } catch {
      showToast('Error al cancelar', 'error')
    } finally {
      setBusy(null)
    }
  }

  const planName = state ? PLANS[state.plan].name : 'Free'
  const orderLimit = state?.limits.maxOrders
  const invLimit = state?.limits.maxInventoryItems

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-500">
          <CreditCard size={12} className="text-brand-orange" />
          Suscripción
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase mt-1">Plan & Billing</h1>
        <p className="text-neutral-500 text-sm mt-1">Tu plan actual, uso y upgrades.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-brand-orange" size={32} />
        </div>
      ) : state ? (
        <>
          {/* Plan actual + uso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Plan actual</div>
              <div className={cn(
                'text-2xl font-black uppercase mt-1',
                state.plan === 'PRO' ? 'text-brand-orange' : state.plan === 'BASIC' ? 'text-brand-cyan' : 'text-neutral-300'
              )}>
                {planName}
              </div>
              <div className="text-neutral-500 text-xs mt-1">
                {state.status === 'cancelled' ? 'Cancelado al final del período' : state.status}
              </div>
              {state.periodEnd && (
                <div className="text-neutral-500 text-xs mt-1">
                  Renueva: {new Date(state.periodEnd).toLocaleDateString('es-AR')}
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Pedidos</div>
              <div className="text-2xl font-black mt-1">
                {state.currentUsage.orders}
                {orderLimit !== null && <span className="text-neutral-500 text-base"> / {orderLimit}</span>}
              </div>
              {orderLimit != null && (
                <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-orange rounded-full"
                    style={{ width: `${Math.min(100, (state.currentUsage.orders / orderLimit) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Materiales en stock</div>
              <div className="text-2xl font-black mt-1">
                {state.currentUsage.inventory}
                {invLimit !== null && <span className="text-neutral-500 text-base"> / {invLimit}</span>}
              </div>
              {invLimit != null && (
                <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-cyan rounded-full"
                    style={{ width: `${Math.min(100, (state.currentUsage.inventory / invLimit) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {state.plan !== 'FREE' && (
            <div className="flex justify-end">
              <button
                onClick={cancel}
                disabled={busy === 'cancel'}
                className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold text-xs rounded-xl hover:border-red-500/50 hover:text-red-500 transition-all"
              >
                {busy === 'cancel' ? 'Cancelando...' : 'CANCELAR SUSCRIPCIÓN'}
              </button>
            </div>
          )}

          {/* Cards de planes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_IDS.map((pid) => {
              const plan = PLANS[pid]
              const isCurrent = state.plan === pid
              const isUpgrade = PLAN_IDS.indexOf(pid) > PLAN_IDS.indexOf(state.plan)
              const recommended = pid === 'PRO'
              return (
                <div
                  key={pid}
                  className={cn(
                    'glass-card rounded-2xl p-6 relative flex flex-col',
                    isCurrent && 'ring-2 ring-brand-orange/60',
                    recommended && !isCurrent && 'border-brand-orange/40'
                  )}
                >
                  {recommended && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-brand-orange text-black text-[9px] font-black rounded-full uppercase tracking-widest">
                      Recomendado
                    </span>
                  )}
                  <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{plan.name}</div>
                  <div className="text-3xl font-black mt-2">
                    {plan.priceARS === 0 ? 'Gratis' : formatMoney(plan.priceARS, 'ARS')}
                    {plan.priceARS > 0 && <span className="text-neutral-500 text-sm font-bold"> /mes</span>}
                  </div>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                        <Check size={14} className="text-brand-orange shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      disabled
                      className="mt-5 w-full py-3 bg-neutral-900 border border-neutral-800 text-neutral-500 font-black text-xs rounded-xl cursor-default"
                    >
                      TU PLAN
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => subscribe(pid)}
                      disabled={busy === pid}
                      className="mt-5 w-full py-3 bg-brand-orange text-black font-black text-xs rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,102,0,0.2)] disabled:opacity-60"
                    >
                      {busy === pid ? 'Creando...' : state.paymentsEnabled ? 'MEJORAR A ' + plan.name : 'PROXIMAMENTE'}
                    </button>
                  ) : (
                    <button
                      onClick={() => subscribe(pid)}
                      disabled={busy === pid}
                      className="mt-5 w-full py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-black text-xs rounded-xl hover:border-brand-cyan/50 transition-all disabled:opacity-60"
                    >
                      {busy === pid ? 'Creando...' : state.paymentsEnabled ? 'SUSCRIBIRSE' : 'PROXIMAMENTE'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {!state.paymentsEnabled && (
            <div className="glass-card rounded-2xl p-4 flex items-start gap-3 border border-neutral-800">
              <X size={16} className="text-brand-orange shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-400">
                Los pagos por MercadoPago se habilitan próximamente. Mientras tanto, el plan Free está activo con sus límites.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-neutral-400 text-sm">No se pudo cargar la información del plan.</div>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <ToastProvider>
      <BillingContent />
    </ToastProvider>
  )
}
