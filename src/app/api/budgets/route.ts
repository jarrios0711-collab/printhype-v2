import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const BudgetSchema = z.object({
  clientName: z.string().min(1, 'Nombre del cliente requerido'),
  jobName: z.string().min(1, 'Nombre del trabajo requerido'),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED']).optional().default('DRAFT'),
  materialId: z.string().nullable().optional().default(null),
  filamentGrams: z.number().min(0).optional().default(0),
  printHours: z.number().min(0).optional().default(0),
  energyCost: z.number().min(0).optional().default(0),
  laborCost: z.number().min(0).optional().default(0),
  materialCost: z.number().min(0).optional().default(0),
  totalCost: z.number().min(0).optional().default(0),
  salePrice: z.number().min(0).optional().default(0),
  profitPercent: z.number().optional().default(0),
  profitAmount: z.number().optional().default(0),
  marginPercent: z.number().optional().default(0),
  notes: z.string().optional().default(''),
  currency: z.string().optional().default('ARS'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()
    const { data: budgets, error } = await admin
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json((budgets || []).map((b: any) => ({
      id: b.id,
      clientName: b.client_name,
      jobName: b.job_name,
      status: b.status,
      materialId: b.material_id,
      filamentGrams: Number(b.filament_grams),
      printHours: Number(b.print_hours),
      energyCost: Number(b.energy_cost),
      laborCost: Number(b.labor_cost),
      materialCost: Number(b.material_cost),
      totalCost: Number(b.total_cost),
      salePrice: Number(b.sale_price),
      profitPercent: Number(b.profit_percent),
      profitAmount: Number(b.profit_amount),
      marginPercent: Number(b.margin_percent),
      notes: b.notes || '',
      currency: b.currency || 'ARS',
      createdAt: b.created_at,
    })))
  } catch (error) {
    console.error('GET /api/budgets error:', error)
    return NextResponse.json({ error: 'Error al cargar presupuestos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = BudgetSchema.parse(body)

    const admin = getServiceClient()
    let result = await admin
      .from('budgets')
      .insert([{
        user_id: user.id,
        client_name: parsed.clientName,
        job_name: parsed.jobName,
        status: parsed.status,
        material_id: parsed.materialId,
        filament_grams: parsed.filamentGrams,
        print_hours: parsed.printHours,
        energy_cost: parsed.energyCost,
        labor_cost: parsed.laborCost,
        material_cost: parsed.materialCost,
        total_cost: parsed.totalCost,
        sale_price: parsed.salePrice,
        profit_percent: parsed.profitPercent,
        profit_amount: parsed.profitAmount,
        margin_percent: parsed.marginPercent,
        notes: parsed.notes,
        currency: parsed.currency,
      }])
      .select()
      .single()

    if (result.error && result.error.code === '42703') { // Fallback if currency column doesn't exist
      result = await admin
        .from('budgets')
        .insert([{
          user_id: user.id,
          client_name: parsed.clientName,
          job_name: parsed.jobName,
          status: parsed.status,
          material_id: parsed.materialId,
          filament_grams: parsed.filamentGrams,
          print_hours: parsed.printHours,
          energy_cost: parsed.energyCost,
          labor_cost: parsed.laborCost,
          material_cost: parsed.materialCost,
          total_cost: parsed.totalCost,
          sale_price: parsed.salePrice,
          profit_percent: parsed.profitPercent,
          profit_amount: parsed.profitAmount,
          margin_percent: parsed.marginPercent,
          notes: parsed.notes,
        }])
        .select()
        .single()
    }

    if (result.error) throw result.error
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
      createdAt: data.created_at,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/budgets error:', error)
    return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 })
  }
}
