import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { cancelPreapproval } from '@/lib/mercadopago'
import { getSubscriptionRow } from '@/lib/billing'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()
    const sub = await getSubscriptionRow(user.id)

    if (sub?.mp_preapproval_id) {
      try {
        await cancelPreapproval(sub.mp_preapproval_id)
      } catch (err) {
        console.error('Error cancelando preapproval:', err)
      }
    }

    const { error } = await admin
      .from('user_subscriptions')
      .update({ status: 'cancelled', cancel_at_period_end: true })
      .eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/billing/cancel error:', error)
    return NextResponse.json({ error: 'Error al cancelar la suscripción' }, { status: 500 })
  }
}
