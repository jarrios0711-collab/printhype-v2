import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const AI_CONFIG_DEFAULTS = {
  provider: 'ollama',
  api_key: '',
  model: 'gemma3:4b',
  base_url: 'http://localhost:11434',
}

const AiConfigSchema = z.object({
  provider: z.enum(['openai', 'groq', 'gemini', 'deepseek', 'ollama', 'openrouter']),
  api_key: z.string().optional().default(''),
  model: z.string().optional().default('gemma3:4b'),
  base_url: z.string().optional().default('http://localhost:11434'),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()
    const { data: config } = await admin
      .from('user_ai_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!config) {
      return NextResponse.json({
        provider: AI_CONFIG_DEFAULTS.provider,
        apiKey: AI_CONFIG_DEFAULTS.api_key,
        model: AI_CONFIG_DEFAULTS.model,
        baseUrl: AI_CONFIG_DEFAULTS.base_url,
      })
    }

    return NextResponse.json({
      provider: config.provider,
      apiKey: config.api_key || '',
      model: config.model,
      baseUrl: config.base_url,
    })
  } catch (error) {
    console.error('GET /api/user/ai-config error:', error)
    return NextResponse.json({ error: 'Error al cargar configuración de IA' }, { status: 500 })
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
    const parsed = AiConfigSchema.parse(body)

    const admin = getServiceClient()

    // Primero intentar actualizar si ya existe
    const { data: existing } = await admin
      .from('user_ai_config')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let result
    if (existing) {
      // Update existing
      result = await admin
        .from('user_ai_config')
        .update({
          provider: parsed.provider,
          api_key: parsed.api_key,
          model: parsed.model,
          base_url: parsed.base_url,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert new
      result = await admin
        .from('user_ai_config')
        .insert({
          user_id: user.id,
          provider: parsed.provider,
          api_key: parsed.api_key,
          model: parsed.model,
          base_url: parsed.base_url,
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return NextResponse.json({
      success: true,
      data: {
        provider: result.data.provider,
        apiKey: result.data.api_key || '',
        model: result.data.model,
        baseUrl: result.data.base_url,
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/user/ai-config error:', error)
    return NextResponse.json({ error: 'Error al guardar configuración de IA' }, { status: 500 })
  }
}
