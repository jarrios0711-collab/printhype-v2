import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const OrderSchema = z.object({
  customerName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  customerPhone: z.string().optional().default(''),
  totalPrice: z.string().or(z.number()).transform(v => Number(v)),
  projectName: z.string().min(2, 'Proyecto debe tener al menos 2 caracteres'),
  materialId: z.string().optional().nullable(),
  weightGrams: z.string().or(z.number()).optional().transform(v => (v ? Number(v) : null)),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
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
      }])
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}
