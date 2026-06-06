import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const PROVIDER_META = {
  openai: { name: 'OpenAI', defaultModel: 'gpt-4o-mini', defaultUrl: 'https://api.openai.com/v1' },
  groq: { name: 'Groq', defaultModel: 'llama-3.3-70b-versatile', defaultUrl: 'https://api.groq.com/openai/v1' },
  gemini: { name: 'Gemini', defaultModel: 'gemini-2.0-flash', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  deepseek: { name: 'DeepSeek', defaultModel: 'deepseek-chat', defaultUrl: 'https://api.deepseek.com/v1' },
  ollama: { name: 'Ollama', defaultModel: 'gemma3:4b', defaultUrl: 'http://localhost:11434' },
  openrouter: { name: 'OpenRouter', defaultModel: 'google/gemini-2.0-flash-001', defaultUrl: 'https://openrouter.ai/api/v1' },
}

function buildSystemPrompt(context: string, fileData: any, dbContext: string): string {
  let sp = `Eres un asistente experto en impresión 3D para el ecosistema JR3D. Tu objetivo es ayudar al usuario a optimizar su taller y maximizar el ROI.
Tienes VISIBILIDAD TOTAL de los datos del taller en tiempo real (pedidos, inventario de filamentos, presupuestos, impresoras).

${dbContext}

REGLAS DE NEGOCIO JR3D:
1. Peso = Volumen * Densidad (PLA: 1.24, PETG: 1.27).
2. Costo Material = (Peso / 1000) * PrecioKg.
3. Margen Sugerido: 2.5x - 3.0x del costo base.
4. Si te preguntan sobre pedidos, stock o impresoras, responde con los datos reales mostrados arriba. ¡Sé directo y resolutivo, no preguntes información que ya tienes!`

  if (context === 'Calculador de Costos') {
    sp += `\n\nESTÁS EN MODO CALCULADOR TÉCNICO.\n\nSi el usuario proporciona datos de un archivo STL, analízalos rigurosamente:\n- Dimensiones (en mm): Interpreta X, Y, Z.\n- Volumen (en cm3): Úsalo para estimar el peso.\n\nResponde siempre con una tabla de costos y una recomendación de precio final.`
    if (fileData) {
      sp += `\n\nMETADATOS DEL ARCHIVO ACTUAL:\n- Nombre: ${fileData.name}\n- Dimensiones: ${fileData.dimensions.x.toFixed(2)}x${fileData.dimensions.y.toFixed(2)}x${fileData.dimensions.z.toFixed(2)} mm\n- Volumen: ${fileData.volumeCm3.toFixed(2)} cm³\n- Peso Est. (PLA): ${fileData.weightGrams.pla.toFixed(2)}g`
    }
  } else if (context === 'Content Generator') {
    sp += `\n\nTu tarea es crear contenido viral para redes sociales sobre impresión 3D, enfocado en captación de clientes y engagement. Responde en español.`
  }

  return sp
}

async function streamOpenAI(baseUrl: string, apiKey: string, model: string, messages: any[]) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error: ${res.status} — ${body.slice(0, 200)}`)
  }

  return new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue
          try {
            const json = JSON.parse(trimmed.slice(6))
            const content = json.choices?.[0]?.delta?.content
            if (content) controller.enqueue(content)
          } catch {}
        }
      }
      controller.close()
    },
  })
}

async function streamGemini(baseUrl: string, apiKey: string, model: string, messages: any[]) {
  const contents = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const url = `${baseUrl.replace(/\/+$/, '')}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)

  return new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) controller.enqueue(text)
          } catch {}
        }
      }
      controller.close()
    },
  })
}

async function streamOllama(baseUrl: string, model: string, prompt: string) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/generate`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: true }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)

  return new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const json = JSON.parse(line)
            if (json.response) controller.enqueue(json.response)
          } catch {}
        }
      }
      controller.close()
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, fileData } = await req.json()

    // Get user's AI config
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = getServiceClient()

    let config: any = null
    if (user) {
      const { data } = await admin
        .from('user_ai_config')
        .select('*')
        .eq('user_id', user.id)
        .single()
      config = data
    }

    const provider = (config?.provider || 'ollama') as keyof typeof PROVIDER_META
    const meta = PROVIDER_META[provider]
    const apiKey = config?.api_key || ''
    const model = config?.model || meta.defaultModel
    const baseUrl = config?.base_url || meta.defaultUrl

    // --- Consultar bases de datos para inyectar en prompt ---
    let dbContext = ''
    try {
      const [ordersRes, inventoryRes, printersRes, budgetsRes] = await Promise.all([
        admin.from('order_registry').select('*').order('created_at', { ascending: false }).limit(20),
        admin.from('inventory_items').select('*'),
        admin.from('printers').select('*'),
        admin.from('budgets').select('*').limit(20)
      ])

      const orders = ordersRes.data || []
      const materials = inventoryRes.data || []
      const printers = printersRes.data || []
      const budgets = budgetsRes.data || []

      const activeOrders = orders.filter(o => o.status !== 'COMPLETED')
      const lowStock = materials.filter(m => (m.stock_units || 0) < 200)

      dbContext = `[DATOS OPERATIVOS DEL TALLER EN TIEMPO REAL]
- Pedidos Activos (${activeOrders.length}):
${activeOrders.map(o => `  * ID: ${o.id.slice(0, 8)}, Cliente: ${o.customer_name}, Proyecto: ${o.item_reference}, Estado: ${o.status || 'PENDING'}, Prioridad: ${o.priority}, Precio: $${o.total_price}`).join('\n')}

- Stock de Materiales (${materials.length} total, ${lowStock.length} bajos):
${materials.map(m => `  * Material: ${m.name} (${m.brand || 'Genérico'}), Stock: ${m.stock_units || 0}g, Categoría: ${m.category || 'PLA'}, Color: ${m.color}`).join('\n')}

- Impresoras Registradas (${printers.length}):
${printers.map(p => `  * Impresora: ${p.name}, IP: ${p.ip_address || 'Sin IP'}`).join('\n')}

- Presupuestos Recientes (${budgets.length}):
${budgets.map(b => `  * Cliente: ${b.client_name}, Trabajo: ${b.job_name}, Estado: ${b.status}, Precio: $${b.sale_price}`).join('\n')}
`
    } catch (dbErr) {
      console.error('Error fetching dynamic database context for AI:', dbErr)
      dbContext = '[Advertencia: No se pudo cargar el contexto dinámico de la base de datos]'
    }

    console.log('[ai/stream] provider=%s model=%s baseUrl=%s hasKey=%s', provider, model, baseUrl, apiKey ? 'yes' : 'NO')

    const systemPrompt = buildSystemPrompt(context, fileData, dbContext)
    const userMessage = `Usuario: ${prompt}\n\nAsistente:`

    let stream: ReadableStream

    if (provider === 'ollama') {
      stream = await streamOllama(baseUrl, model, `${systemPrompt}\n\n${userMessage}`)
    } else if (provider === 'gemini') {
      const messages = [
        { role: 'user', content: `${systemPrompt}\n\n${userMessage}` },
      ]
      stream = await streamGemini(baseUrl, apiKey, model, messages)
    } else {
      // OpenAI-compatible (openai, groq, openrouter)
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]
      stream = await streamOpenAI(baseUrl, apiKey, model, messages)
    }

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error: any) {
    console.error('AI Route Error:', error)
    return new Response(
      JSON.stringify({
        error: `Error de conexión con la IA: ${error.message || 'Verificá tu configuración en Ajustes → Conectividad.'}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
