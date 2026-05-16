import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const StatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PRINTING', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getServiceClient()
    const { id } = await params
    const { data: p, error } = await supabase.from('order_registry').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      id: p.id,
      customerName: p.customer_name,
      customerPhone: p.customer_contact,
      status: p.status || 'PENDING',
      priority: p.priority || 'NORMAL',
      totalPrice: p.total_price,
      createdAt: p.created_at,
      materialId: p.inventory_id,
      weightGrams: p.units_consumed,
      stockDeducted: p.stock_deducted,
      items: [{ id: 'item-1', projectName: p.item_reference, quantity: 1, price: p.total_price }],
    })
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Error al cargar pedido' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json()
    const { status } = StatusUpdateSchema.parse(body)

    const supabase = getServiceClient()
    const { id: orderId } = await params

    const { data: order, error: fetchError } = await supabase
      .from('order_registry')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError) throw fetchError

    if (status === 'COMPLETED' && !order.stock_deducted && order.inventory_id && order.units_consumed) {
      const { data: inventory } = await supabase
        .from('inventory_items')
        .select('stock_units')
        .eq('id', order.inventory_id)
        .single()

      if (inventory) {
        const newStock = (inventory.stock_units || 0) - order.units_consumed
        await supabase
          .from('inventory_items')
          .update({ stock_units: Math.max(0, newStock) })
          .eq('id', order.inventory_id)
      }

      await supabase
        .from('order_registry')
        .update({ status, stock_deducted: true })
        .eq('id', orderId)
    } else {
      const { error: updateError } = await supabase
        .from('order_registry')
        .update({ status })
        .eq('id', orderId)

      if (updateError) throw updateError
    }

    const { data: u, error: finalError } = await supabase
      .from('order_registry')
      .select('*')
      .eq('id', orderId)
      .single()

    if (finalError) throw finalError

    return NextResponse.json({
      id: u.id,
      customerName: u.customer_name,
      customerPhone: u.customer_contact,
      status: u.status || 'PENDING',
      priority: u.priority || 'NORMAL',
      totalPrice: u.total_price,
      createdAt: u.created_at,
      stockDeducted: u.stock_deducted,
      items: [{ id: 'item-1', projectName: u.item_reference, quantity: 1, price: u.total_price }],
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 })
  }
}
