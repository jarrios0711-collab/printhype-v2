import { getServiceClient } from '@/lib/supabase/admin'
import { PLANS, type PlanId } from '@/config/plans'

export class PlanLimitError extends Error {
  status = 402
  constructor(message: string) {
    super(message)
    this.name = 'PlanLimitError'
  }
}

export interface SubscriptionRow {
  plan: string
  status: string
  current_period_end?: string | null
  mp_preapproval_id?: string | null
  mp_payer_id?: string | null
  last_payment_at?: string | null
  last_payment_id?: string | null
  cancel_at_period_end?: boolean
}

export async function getActivePlan(userId: string): Promise<PlanId> {
  const admin = getServiceClient()
  const { data } = await admin
    .from('user_subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return 'FREE'
  const row = data as SubscriptionRow
  const isActive =
    row.status === 'active' &&
    (!row.current_period_end || new Date(row.current_period_end).getTime() > Date.now())
  return isActive ? (row.plan as PlanId) : 'FREE'
}

export async function getSubscriptionRow(userId: string): Promise<SubscriptionRow | null> {
  const admin = getServiceClient()
  const { data } = await admin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as SubscriptionRow) || null
}

export async function getCurrentUsage(
  userId: string
): Promise<{ orders: number; inventory: number }> {
  const admin = getServiceClient()
  const [{ count: orders }, { count: inventory }] = await Promise.all([
    admin
      .from('order_registry')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    admin
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])
  return { orders: orders || 0, inventory: inventory || 0 }
}

/** Lanza PlanLimitError (402) si el usuario excede el límite del recurso en su plan */
export async function enforcePlanLimit(
  userId: string,
  resource: 'orders' | 'inventory'
): Promise<void> {
  const plan = await getActivePlan(userId)
  const limits = PLANS[plan]
  const usage = await getCurrentUsage(userId)
  const max = resource === 'orders' ? limits.maxOrders : limits.maxInventoryItems
  const current = resource === 'orders' ? usage.orders : usage.inventory

  if (current >= max) {
    throw new PlanLimitError(
      resource === 'orders'
        ? 'Alcanzaste el límite de pedidos de tu plan. Mejorá tu plan para seguir creando pedidos.'
        : 'Alcanzaste el límite de materiales de tu plan. Mejorá tu plan para seguir agregando stock.'
    )
  }
}
