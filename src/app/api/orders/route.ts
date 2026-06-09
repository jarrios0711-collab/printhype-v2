import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { triggerWebhook } from '@/lib/webhook'

const OrderSchema = z.object({
  customerName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  customerPhone: z.string().optional().default(''),
  totalPrice: z.string().or(z.number()).transform(v => Number(v)),
  projectName: z.string().min(2, 'Proyecto debe tener al menos 2 caracteres'),
  materialId: z.string().optional().nullable(),
  weightGrams: z.string().or(z.number()).optional().transform(v => (v ? Number(v) : null)),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  deliveryDate: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data: records, error } = await supabase
      .from('order_registry')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const formatted = (records || []).map((p: any) => ({
      id: p.id,
      customerName: p.customer_name,
      customerPhone: p.customer_contact,
      status: p.status || 'PENDING',
      totalPrice: p.total_price,
      priority: p.priority || 'NORMAL',
      createdAt: p.created_at,
      deliveryDate: p.delivery_date || null,
      stockDeducted: p.stock_deducted || false,
      items: [{
        projectName: p.item_reference,
        quantity: 1,
        price: p.total_price,
        materialId: p.inventory_id,
        weightGrams: p.units_consumed,
      }],
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'Error al cargar pedidos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = OrderSchema.parse(body)
    const userWebhook = req.headers.get('x-webhook-url') || undefined

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('order_registry')
      .insert([{
        customer_name: parsed.customerName,
        customer_contact: parsed.customerPhone,
        total_price: parsed.totalPrice,
        item_reference: parsed.projectName,
        status: 'PENDING',
        priority: parsed.priority,
        inventory_id: parsed.materialId || null,
        units_consumed: parsed.weightGrams,
        delivery_date: parsed.deliveryDate || null,
      }])
      .select()

    if (error) throw error

    // Crear proyecto correspondiente en el tablero Kanban
    try {
      const priorityMap: Record<string, 'low' | 'medium' | 'high'> = {
        'NORMAL': 'medium',
        'HIGH': 'high',
        'URGENT': 'high'
      }
      const projectPriority = priorityMap[parsed.priority] || 'medium'

      await supabase
        .from('project_board')
        .insert([{
          title: parsed.projectName,
          client: parsed.customerName,
          priority: projectPriority,
          status: 'ready',
          due_date: parsed.deliveryDate || null,
          progress: 0,
        }])
    } catch (projectErr) {
      console.error('Error al crear proyecto desde pedido:', projectErr)
    }

    // Descontar stock del inventario si hay material y peso
    if (parsed.materialId && parsed.weightGrams && parsed.weightGrams > 0 && data && data[0]) {
      try {
        const { data: material, error: matError } = await supabase
          .from('inventory_items')
          .select('stock_units')
          .eq('id', parsed.materialId)
          .single()

        if (!matError && material) {
          const newStock = Math.max(0, (material.stock_units || 0) - parsed.weightGrams)
          await supabase
            .from('inventory_items')
            .update({ stock_units: newStock })
            .eq('id', parsed.materialId)

          // Marcar la orden como stock descontado
          await supabase
            .from('order_registry')
            .update({ stock_deducted: true })
            .eq('id', data[0].id)
        }
      } catch (stockErr) {
        // No interrumpir el flujo si el descuento falla
        console.error('Error descontando stock:', stockErr)
      }
    }

    // Webhook: nuevo pedido
    triggerWebhook(
      'order.created',
      'Nuevo Pedido',
      `Pedido de ${parsed.customerName} — $${Number(parsed.totalPrice).toLocaleString()} — ${parsed.projectName}`,
      { customerName: parsed.customerName, totalPrice: parsed.totalPrice, projectName: parsed.projectName },
      userWebhook
    )

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}
