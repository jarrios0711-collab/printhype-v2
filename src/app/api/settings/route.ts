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

const DEFAULT_SETTINGS = {
  currency: 'ARS' as const,
  kwhPrice: 120.50,
  profitMargin: 1.5,
  laborHourPrice: 800,
  failRatePercent: 10,
  overheadPerJob: 0,
  ollamaUrl: 'http://localhost:11434',
  webhookUrl: '',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()

    // 1) Defaults globales (ajustes) — fuente de ollamaUrl/webhookUrl
    const { data: globalRow } = await admin
      .from('ajustes')
      .select('*')
      .eq('id', 'global')
      .single()

    const settings = {
      ...DEFAULT_SETTINGS,
      ...(globalRow ? {
        currency: globalRow.moneda || DEFAULT_SETTINGS.currency,
        kwhPrice: globalRow.precio_kwh ?? DEFAULT_SETTINGS.kwhPrice,
        profitMargin: globalRow.margen_ganancia ?? DEFAULT_SETTINGS.profitMargin,
        laborHourPrice: globalRow.precio_hora_laboral ?? DEFAULT_SETTINGS.laborHourPrice,
        failRatePercent: globalRow.tasa_fallo ?? DEFAULT_SETTINGS.failRatePercent,
        overheadPerJob: globalRow.gastos_por_trabajo ?? DEFAULT_SETTINGS.overheadPerJob,
        ollamaUrl: globalRow.ollama_url || DEFAULT_SETTINGS.ollamaUrl,
        webhookUrl: globalRow.webhook_url || DEFAULT_SETTINGS.webhookUrl,
      } : {}),
    }

    // 2) Override financiero per-user (user_settings)
    const { data: userSettings } = await admin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userSettings) {
      settings.currency = userSettings.currency || settings.currency
      settings.kwhPrice = Number(userSettings.kwh_price ?? settings.kwhPrice)
      settings.profitMargin = Number(userSettings.profit_margin ?? settings.profitMargin)
      settings.laborHourPrice = Number(userSettings.labor_hour_price ?? settings.laborHourPrice)
      settings.failRatePercent = Number(userSettings.fail_rate_percent ?? settings.failRatePercent)
      settings.overheadPerJob = Number(userSettings.overhead_per_job ?? settings.overheadPerJob)
    }

    return NextResponse.json({
      id: globalRow?.id || 'settings',
      currency: settings.currency,
      kwhPrice: settings.kwhPrice,
      profitMargin: settings.profitMargin,
      laborHourPrice: settings.laborHourPrice,
      failRatePercent: settings.failRatePercent,
      overheadPerJob: settings.overheadPerJob,
      ollamaUrl: settings.ollamaUrl,
      webhookUrl: settings.webhookUrl,
      updatedAt: userSettings?.updated_at || globalRow?.updated_at || null,
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

    // 1) Upsert financiero per-user (ya no se pisa la fila global compartida)
    let result = await admin
      .from('user_settings')
      .upsert({
        user_id: user.id,
        currency: parsed.currency,
        kwh_price: parsed.kwhPrice,
        profit_margin: parsed.profitMargin,
        labor_hour_price: parsed.laborHourPrice,
        fail_rate_percent: parsed.failRatePercent,
        overhead_per_job: parsed.overheadPerJob,
        updated_at: new Date().toISOString(),
      })
      .select()

    // Fallback 42703 (columna faltante) / 42P01 (tabla no existe): comportamiento legacy
    if (result.error && (result.error.code === '42703' || result.error.code === '42P01')) {
      result = await admin
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
    }

    if (result.error) throw result.error

    // 2) Compatibilidad webhook: el webhook_url sigue siendo global (del taller)
    if (parsed.webhookUrl) {
      try {
        await admin
          .from('ajustes')
          .update({ webhook_url: parsed.webhookUrl })
          .eq('id', 'global')
      } catch (webhookErr) {
        console.error('Error actualizando webhook_url global:', webhookErr)
      }
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/settings error:', error)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
