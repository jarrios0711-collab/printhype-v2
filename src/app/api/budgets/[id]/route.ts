import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const UpdateSchema = z.object({
  clientName: z.string().min(1).optional(),
  jobName: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED']).optional(),
  materialId: z.string().nullable().optional(),
  filamentGrams: z.number().min(0).optional(),
  printHours: z.number().min(0).optional(),
  energyCost: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  profitPercent: z.number().optional(),
  profitAmount: z.number().optional(),
  marginPercent: z.number().optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
  consumablesCost: z.number().min(0).optional(),
  overheadCost: z.number().min(0).optional(),
  failBuffer: z.number().min(0).optional(),
  depreciationCost: z.number().min(0).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = UpdateSchema.parse(body)

    const updateData: Record<string, any> = {}
    if (parsed.clientName !== undefined) updateData.client_name = parsed.clientName
    if (parsed.jobName !== undefined) updateData.job_name = parsed.jobName
    if (parsed.status !== undefined) updateData.status = parsed.status
    if (parsed.materialId !== undefined) updateData.material_id = parsed.materialId
    if (parsed.filamentGrams !== undefined) updateData.filament_grams = parsed.filamentGrams
    if (parsed.printHours !== undefined) updateData.print_hours = parsed.printHours
    if (parsed.energyCost !== undefined) updateData.energy_cost = parsed.energyCost
    if (parsed.laborCost !== undefined) updateData.labor_cost = parsed.laborCost
    if (parsed.materialCost !== undefined) updateData.material_cost = parsed.materialCost
    if (parsed.totalCost !== undefined) updateData.total_cost = parsed.totalCost
    if (parsed.salePrice !== undefined) updateData.sale_price = parsed.salePrice
    if (parsed.profitPercent !== undefined) updateData.profit_percent = parsed.profitPercent
    if (parsed.profitAmount !== undefined) updateData.profit_amount = parsed.profitAmount
    if (parsed.marginPercent !== undefined) updateData.margin_percent = parsed.marginPercent
    if (parsed.notes !== undefined) updateData.notes = parsed.notes
    if (parsed.currency !== undefined) updateData.currency = parsed.currency
    if (parsed.consumablesCost !== undefined) updateData.consumables_cost = parsed.consumablesCost
    if (parsed.overheadCost !== undefined) updateData.overhead_cost = parsed.overheadCost
    if (parsed.failBuffer !== undefined) updateData.fail_buffer = parsed.failBuffer
    if (parsed.depreciationCost !== undefined) updateData.depreciation_cost = parsed.depreciationCost

    const admin = getServiceClient()
    let result = await admin
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (result.error && result.error.code === '42703') { // Fallback: sin columnas de desglose/currency
      const safeUpdates = { ...updateData }
      delete safeUpdates.currency
      delete safeUpdates.consumables_cost
      delete safeUpdates.overhead_cost
      delete safeUpdates.fail_buffer
      delete safeUpdates.depreciation_cost
      result = await admin
        .from('budgets')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
    }

    if (result.error) throw result.error
    if (!result.data) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }
    const data = result.data

    return NextResponse.json({
      id: data.id,
      clientName: data.client_name,
      jobName: data.job_name,
      status: data.status,
      materialId: data.material_id,
      filamentGrams: Number(data.filament_grams),
      printHours: Number(data.print_hours),
      energyCost: Number(data.energy_cost),
      laborCost: Number(data.labor_cost),
      materialCost: Number(data.material_cost),
      totalCost: Number(data.total_cost),
      salePrice: Number(data.sale_price),
      profitPercent: Number(data.profit_percent),
      profitAmount: Number(data.profit_amount),
      marginPercent: Number(data.margin_percent),
      notes: data.notes || '',
      currency: data.currency || 'ARS',
      consumablesCost: Number(data.consumables_cost ?? 0),
      overheadCost: Number(data.overhead_cost ?? 0),
      failBuffer: Number(data.fail_buffer ?? 0),
      depreciationCost: Number(data.depreciation_cost ?? 0),
      createdAt: data.created_at,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('PATCH /api/budgets/[id] error:', error)
    return NextResponse.json({ error: 'Error al actualizar presupuesto' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()
    const { error } = await admin
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/budgets/[id] error:', error)
    return NextResponse.json({ error: 'Error al eliminar presupuesto' }, { status: 500 })
  }
}
