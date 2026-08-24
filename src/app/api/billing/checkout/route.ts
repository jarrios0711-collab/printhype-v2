import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { createSubscription, mercadopagoEnabled, cancelPreapproval } from '@/lib/mercadopago'
import { getSubscriptionRow } from '@/lib/billing'
import { PLANS, type PlanId } from '@/config/plans'

const CheckoutSchema = z.object({
  plan: z.enum(['BASIC', 'PRO']),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!mercadopagoEnabled()) {
      return NextResponse.json(
        { error: 'Los pagos aún no están habilitados. Volvé a intentar en unos días.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const parsed = CheckoutSchema.parse(body)
    const planId = parsed.plan as PlanId
    const admin = getServiceClient()

    // Si ya había una suscripción con preapproval, cancelarla antes de crear la nueva
    const existing = await getSubscriptionRow(user.id)
    if (existing?.mp_preapproval_id) {
      try {
        await cancelPreapproval(existing.mp_preapproval_id)
      } catch (err) {
        console.error('Error cancelando preapproval previa:', err)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://printhype-v2.vercel.app'
    const mp = await createSubscription({
      reason: `Suscripción PrintHype ${planId}`,
      amount: PLANS[planId].priceARS,
      payerEmail: user.email || '',
      externalReference: user.id,
      backUrl: `${appUrl}/dashboard/billing`,
    })

    const { error: upsertError } = await admin.from('user_subscriptions').upsert({
      user_id: user.id,
      plan: planId,
      status: 'pending',
      mp_preapproval_id: mp.id,
      mp_payer_id: mp.payer_id ? String(mp.payer_id) : null,
    })
    if (upsertError) throw upsertError

    return NextResponse.json({ success: true, initPoint: mp.init_point, preapprovalId: mp.id })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/billing/checkout error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al crear el checkout' },
      { status: 500 }
    )
  }
}
