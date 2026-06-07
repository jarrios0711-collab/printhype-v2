import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { provider, apiKey, model } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'La API Key está vacía' }, { status: 400 })
    }

    let url = 'https://openrouter.ai/api/v1/auth/key'
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    // Si es otro proveedor, podemos hacer un test rápido de modelos o similar
    if (provider === 'openai') {
      url = 'https://api.openai.com/v1/models'
    } else if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/models'
    } else if (provider === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      headers = { 'Content-Type': 'application/json' }
    } else if (provider === 'deepseek') {
      url = 'https://api.deepseek.com/models'
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/auth/key'
    } else if (provider === 'ollama') {
      return NextResponse.json({ success: true, message: 'Ollama no requiere API Key externa' })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(url, {
      method: provider === 'openrouter' ? 'GET' : 'GET',
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      return NextResponse.json({ success: true })
    } else {
      const text = await res.text()
      console.warn('API validation failed:', res.status, text)
      return NextResponse.json({ error: `La API Key es inválida o el servicio respondió con error (Status: ${res.status})` }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Validation route error:', error)
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'La solicitud de validación excedió el tiempo límite. Verifica tu conexión.' }, { status: 408 })
    }
    return NextResponse.json({ error: `Error de conexión: ${error.message}` }, { status: 500 })
  }
}
