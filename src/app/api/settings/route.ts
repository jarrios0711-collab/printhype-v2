import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const SettingsSchema = z.object({
  currency: z.enum(['ARS', 'USD']).optional().default('ARS'),
  kwhPrice: z.number().min(0).optional().default(120.50),
  profitMargin: z.number().min(0).max(10).optional().default(1.5),
  laborHourPrice: z.number().min(0).optional().default(800),
  failRatePercent: z.number().min(0).max(100).optional().default(10),
  overheadPerJob: z.number().min(0).optional().default(0),
  ollamaUrl: z.string().optional().default('http://localhost:11434'),
  webhookUrl: z.string().optional().default(''),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()
    const { data: settings, error } = await admin
      .from('ajustes')
      .select('*')
      .eq('id', 'global')
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!settings) {
      const defaults = {
        id: 'global',
        moneda: 'ARS',
        precio_kwh: 120.50,
        margen_ganancia: 1.5,
        precio_hora_laboral: 800,
        tasa_fallo: 10,
        gastos_por_trabajo: 0,
        ollama_url: 'http://localhost:11434',
        webhook_url: '',
      }

      await admin
        .from('ajustes')
        .insert([defaults])
        .select()
        .single()

      return NextResponse.json({
        id: defaults.id,
        currency: defaults.moneda,
        kwhPrice: defaults.precio_kwh,
        profitMargin: defaults.margen_ganancia,
        laborHourPrice: defaults.precio_hora_laboral,
        failRatePercent: defaults.tasa_fallo,
        overheadPerJob: defaults.gastos_por_trabajo,
        ollamaUrl: defaults.ollama_url,
        webhookUrl: defaults.webhook_url,
        updatedAt: null,
      })
    }

    return NextResponse.json({
      id: settings.id,
      currency: settings.moneda,
      kwhPrice: settings.precio_kwh,
      profitMargin: settings.margen_ganancia,
      laborHourPrice: settings.precio_hora_laboral,
      failRatePercent: settings.tasa_fallo ?? 10,
      overheadPerJob: settings.gastos_por_trabajo ?? 0,
      ollamaUrl: settings.ollama_url || 'http://localhost:11434',
      webhookUrl: settings.webhook_url || '',
      updatedAt: settings.updated_at || null,
    })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 })
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
    const parsed = SettingsSchema.parse(body)

    const admin = getServiceClient()
    let result = await admin
      .from('ajustes')
      .upsert({
        id: 'global',
        moneda: parsed.currency,
        precio_kwh: parsed.kwhPrice,
        margen_ganancia: parsed.profitMargin,
        precio_hora_laboral: parsed.laborHourPrice,
        tasa_fallo: parsed.failRatePercent,
        gastos_por_trabajo: parsed.overheadPerJob,
        ollama_url: parsed.ollamaUrl,
        webhook_url: parsed.webhookUrl,
      })
      .select()

    // Fallback: si las columnas nuevas aún no existen en la tabla, guardar sin ellas
    if (result.error && result.error.code === '42703') {
      result = await admin
        .from('ajustes')
        .upsert({
          id: 'global',
          moneda: parsed.currency,
          precio_kwh: parsed.kwhPrice,
          margen_ganancia: parsed.profitMargin,
          precio_hora_laboral: parsed.laborHourPrice,
          ollama_url: parsed.ollamaUrl,
          webhook_url: parsed.webhookUrl,
        })
        .select()
    }

    if (result.error) throw result.error
    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/settings error:', error)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
