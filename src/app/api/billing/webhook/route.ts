import { NextResponse, type NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { mercadopagoEnabled, getPayment, getPreapproval } from '@/lib/mercadopago'

/**
 * Webhook entrante de MercadoPago (PÚBLICO — sin auth de app).
 *
 * Seguridad: NUNCA se confía en el body. Siempre se re-fetch el recurso
 * server-to-server contra la API de MercadoPago y se mapea external_reference
 * (que es el user_id de PrintHype) antes de tocar la DB.
 */
export async function POST(req: NextRequest) {
  const admin = getServiceClient()

  let raw: any = {}
  try {
    raw = await req.json()
  } catch {
    // body vacío o no-JSON
  }

  // MercadoPago manda el id en el query string (GET) o en el body (POST)
  const qType = req.nextUrl.searchParams.get('type')
  const qId = req.nextUrl.searchParams.get('data.id')
  const topic = raw.type || raw.topic || raw.action || qType || 'unknown'
  const id = raw.data?.id || raw.id || qId || ''

  // 1) Log crudo del evento (auditoría)
  try {
    await admin.from('billing_events').insert({
      user_id: null,
      event_type: String(topic),
      resource_id: String(id),
      payload: raw,
      processed: false,
    })
  } catch (err) {
    console.error('billing_events log error:', err)
  }

  // 2) Procesar verificando server-to-server
  try {
    if (!mercadopagoEnabled() || !id) {
      return NextResponse.json({ ok: true })
    }

    let userId: string | null = null

    if (String(topic).includes('payment')) {
      // subscription_authorized_payment / payment
      const payment: any = await getPayment(String(id))
      const extRef = payment?.external_reference as string | undefined
      if (extRef) userId = extRef

      if (payment?.status === 'approved' && userId) {
        const now = new Date()
        const periodEnd = new Date(now)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await admin.from('user_subscriptions').upsert({
          user_id: userId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          last_payment_at: now.toISOString(),
          last_payment_id: String(id),
        })
        await admin
          .from('billing_events')
          .update({ user_id: userId, processed: true })
          .eq('resource_id', String(id))
      }
    } else if (String(topic).includes('preapproval')) {
      // subscription_preapproval / preapproval
      const pre: any = await getPreapproval(String(id))
      const extRef = pre?.external_reference as string | undefined
      if (extRef) userId = extRef

      if (userId && pre?.status) {
        const statusMap: Record<string, string> = {
          authorized: 'active',
          cancelled: 'cancelled',
          paused: 'paused',
          pending: 'pending',
        }
        const status = statusMap[String(pre.status)] || 'pending'
        await admin.from('user_subscriptions').upsert({
          user_id: userId,
          mp_preapproval_id: String(id),
          status,
        })
        await admin
          .from('billing_events')
          .update({ user_id: userId, processed: true })
          .eq('resource_id', String(id))
      }
    }
  } catch (err) {
    console.error('webhook processing error:', err)
  }

  // 3) Responder 200 rápido
  return NextResponse.json({ ok: true })
}

/** MercadoPago a veces confirma con GET al mismo endpoint */
export async function GET(req: NextRequest) {
  return POST(req)
}
