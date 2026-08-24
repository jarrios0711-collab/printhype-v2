import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActivePlan, getCurrentUsage, getSubscriptionRow } from '@/lib/billing'
import { PLANS } from '@/config/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const plan = await getActivePlan(user.id)
    const limits = PLANS[plan]
    const usage = await getCurrentUsage(user.id)
    const sub = await getSubscriptionRow(user.id)

    return NextResponse.json({
      plan,
      name: limits.name,
      priceARS: limits.priceARS,
      limits: {
        maxOrders: limits.maxOrders === Infinity ? null : limits.maxOrders,
        maxInventoryItems: limits.maxInventoryItems === Infinity ? null : limits.maxInventoryItems,
        aiLab: limits.aiLab,
        tracking: limits.tracking,
      },
      currentUsage: usage,
      periodEnd: sub?.current_period_end || null,
      status: sub?.status || 'active',
      paymentsEnabled: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
    })
  } catch (error) {
    console.error('GET /api/billing/plan error:', error)
    return NextResponse.json({ error: 'Error al cargar el plan' }, { status: 500 })
  }
}
