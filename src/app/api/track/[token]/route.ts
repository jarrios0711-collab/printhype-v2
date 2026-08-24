import { NextResponse } from 'next/server'
import { getOrderByTrackingToken } from '@/lib/tracking'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const order = await getOrderByTrackingToken(token)
    if (!order) {
      return NextResponse.json({ error: 'Seguimiento no encontrado' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('GET /api/track error:', error)
    return NextResponse.json({ error: 'Error al buscar el pedido' }, { status: 500 })
  }
}
