import { getServiceClient } from '@/lib/supabase/admin'

/** Genera un token público de seguimiento (16 hex chars, 64 bits de entropía) */
export function generateTrackingToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface PublicOrder {
  id: string
  customerName: string
  totalPrice: number
  status: string
  priority: string
  itemReference: string
  deliveryDate: string | null
  createdAt: string
  trackingToken: string
}

/**
 * Busca un pedido por su token público. Devuelve SOLO campos públicos
 * (sin user_id, sin inventory_id, sin customer_contact).
 */
export async function getOrderByTrackingToken(token: string): Promise<PublicOrder | null> {
  if (!token || token.length < 12) return null

  const admin = getServiceClient()
  const { data, error } = await admin
    .from('order_registry')
    .select('id,customer_name,total_price,status,priority,item_reference,delivery_date,created_at,tracking_token')
    .eq('tracking_token', token)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    customerName: data.customer_name,
    totalPrice: Number(data.total_price),
    status: data.status || 'PENDING',
    priority: data.priority || 'NORMAL',
    itemReference: data.item_reference,
    deliveryDate: data.delivery_date || null,
    createdAt: data.created_at,
    trackingToken: data.tracking_token,
  }
}
