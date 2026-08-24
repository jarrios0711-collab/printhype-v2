import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { triggerWebhook } from '@/lib/webhook'
import { enforcePlanLimit, PlanLimitError } from '@/lib/billing'

const MaterialSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.string().min(1, 'Tipo requerido'),
  initialWeight: z.string().or(z.number()).transform(v => Number(v)),
  pricePerKg: z.string().or(z.number()).transform(v => Number(v)),
  brand: z.string().optional().default('Genérico'),
  color: z.string().optional().default('#FF6600'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const formatted = (items || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      brand: m.brand || 'Genérico',
      type: m.category,
      color: m.color,
      pricePerKg: m.unit_price,
      initialWeight: m.initial_weight || m.stock_units || 1000,
      stocks: [{ weightGrams: m.stock_units, isActive: true }],
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('GET /api/inventory error:', error)
    return NextResponse.json({ error: 'Error al cargar inventario' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = MaterialSchema.parse(body)
    const userWebhook = req.headers.get('x-webhook-url') || undefined

    // Límite del plan (402 si se supera)
    await enforcePlanLimit(user.id, 'inventory')

    const { data, error } = await supabase
      .from('inventory_items')
      .insert([{
        name: parsed.name,
        category: parsed.type,
        stock_units: parsed.initialWeight,
        initial_weight: parsed.initialWeight,
        unit_price: parsed.pricePerKg,
        brand: parsed.brand,
        color: parsed.color,
        user_id: user.id,
      }])
      .select()

    if (error) throw error

    triggerWebhook(
      'inventory.added',
      'Material Agregado',
      `${parsed.name} — ${parsed.initialWeight}g a $${parsed.pricePerKg}/kg`,
      { name: parsed.name, weight: parsed.initialWeight, price: parsed.pricePerKg },
      userWebhook
    )

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('POST /api/inventory error:', error)
    return NextResponse.json({ error: 'Error al agregar material' }, { status: 500 })
  }
}
