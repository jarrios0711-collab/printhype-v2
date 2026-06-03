import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  stock_units: z.number().min(0).optional(),
  pricePerKg: z.number().min(0).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateSchema.parse(body)

    const updateData: Record<string, any> = {}
    if (parsed.name !== undefined) updateData.name = parsed.name
    if (parsed.type !== undefined) updateData.category = parsed.type
    if (parsed.brand !== undefined) updateData.brand = parsed.brand
    if (parsed.color !== undefined) updateData.color = parsed.color
    if (parsed.stock_units !== undefined) updateData.stock_units = parsed.stock_units
    if (parsed.pricePerKg !== undefined) updateData.unit_price = parsed.pricePerKg

    const admin = getServiceClient()
    const { data, error } = await admin
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      brand: data.brand || 'Genérico',
      type: data.category,
      color: data.color,
      pricePerKg: data.unit_price,
      stocks: [{ weightGrams: data.stock_units, isActive: true }],
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('PATCH /api/inventory/[id] error:', error)
    return NextResponse.json({ error: 'Error al actualizar material' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = getServiceClient()
    const { error } = await admin
      .from('inventory_items')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/inventory/[id] error:', error)
    return NextResponse.json({ error: 'Error al eliminar material' }, { status: 500 })
  }
}
