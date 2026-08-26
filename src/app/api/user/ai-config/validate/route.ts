import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434',
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { provider, apiKey, model, baseUrl } = await req.json()

    if (!apiKey && provider !== 'ollama') {
      return NextResponse.json({ error: 'La API Key está vacía' }, { status: 400 })
    }

    if (provider === 'ollama') {
      return NextResponse.json({ success: true, message: 'Ollama no requiere API Key externa' })
    }

    // Base URL del usuario si viene; si no, el default oficial del provider
    const url = (baseUrl || DEFAULT_BASE_URLS[provider] || '').replace(/\/+$/, '')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      if (provider === 'gemini') {
        // Gemini valida vía query param key
        const res = await fetch(`${url}/models?key=${apiKey}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })
        if (res.ok) return NextResponse.json({ success: true })
        return invalidKey(res.status)
      }

      // OpenAI-compatible (openai, groq, deepseek, openrouter, endpoints custom)
      // 1er intento: GET /models (la mayoría de providers lo soporta)
      const res = await fetch(`${url}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
      })
      if (res.ok) return NextResponse.json({ success: true })

      // 2do intento (fallback): algunos endpoints custom no exponen /models;
      // probamos un chat completion mínimo para validar la key.
      const fallback = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      })
      if (fallback.ok) return NextResponse.json({ success: true })
      return invalidKey(fallback.status)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return NextResponse.json({ error: 'La solicitud de validación excedió el tiempo límite. Verifica tu conexión o el Base URL.' }, { status: 408 })
      }
      return NextResponse.json({ error: `Error de conexión: ${err.message}` }, { status: 500 })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error: any) {
    console.error('Validation route error:', error)
    return NextResponse.json({ error: `Error de conexión: ${error.message}` }, { status: 500 })
  }
}

function invalidKey(status: number) {
  return NextResponse.json(
    { error: `La API Key es inválida o el servicio respondió con error (Status: ${status}). Verificá también el Base URL.` },
    { status: 400 }
  )
}
