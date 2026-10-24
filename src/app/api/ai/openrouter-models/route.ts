import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type OpenRouterModel = {
  id: string
  name?: string
  context_length?: number
  pricing?: { prompt?: string; completion?: string }
}

function isZeroPrice(value?: string) {
  const n = Number(value)
  return Number.isFinite(n) && n === 0
}

/**
 * Devuelve los modelos gratuitos de OpenRouter (pricing prompt y completion en 0).
 * Requiere sesión porque se consume desde Ajustes → IA & Conectividad.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter respondió con estado ${res.status}` },
        { status: 502 }
      )
    }

    const json = await res.json()
    const raw: OpenRouterModel[] = Array.isArray(json?.data) ? json.data : []

    const models = raw
      .filter(m => m?.id && isZeroPrice(m.pricing?.prompt) && isZeroPrice(m.pricing?.completion))
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ models, count: models.length, updatedAt: new Date().toISOString() })
  } catch (error: any) {
    console.error('GET /api/ai/openrouter-models error:', error)
    return NextResponse.json(
      { error: 'No se pudo obtener la lista de modelos gratuitos de OpenRouter' },
      { status: 500 }
    )
  }
}
