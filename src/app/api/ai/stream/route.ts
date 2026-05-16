import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, fileData } = await req.json();

    // System prompt based on context
    let systemPrompt = `Eres un asistente experto en impresión 3D para el ecosistema JR3D. 
    Tu objetivo es ayudar a jarri a optimizar su taller y maximizar el ROI.`;
    
    if (context === 'Calculador de Costos') {
      systemPrompt += `
      ESTÁS EN MODO CALCULADOR TÉCNICO.
      
      Si el usuario proporciona datos de un archivo STL, analízalos rigurosamente:
      - Dimensiones (en mm): Interpreta X, Y, Z.
      - Volumen (en cm3): Úsalo para estimar el peso.
      
      REGLAS DE NEGOCIO JR3D:
      1. Peso = Volumen * Densidad (PLA: 1.24, PETG: 1.27).
      2. Costo Material = (Peso / 1000) * PrecioKg.
      3. Margen Sugerido: 2.5x - 3.0x del costo base.
      4. Tiempo Est.: Un volumen de 100cm3 suele tardar 4-6 horas en una K1 Max (aprox).
      
      Responde siempre con una tabla de costos y una recomendación de precio final.`;

      if (fileData) {
        systemPrompt += `\n\nMETADATOS DEL ARCHIVO ACTUAL:
        - Nombre: ${fileData.name}
        - Dimensiones: ${fileData.dimensions.x.toFixed(2)}x${fileData.dimensions.y.toFixed(2)}x${fileData.dimensions.z.toFixed(2)} mm
        - Volumen: ${fileData.volumeCm3.toFixed(2)} cm³
        - Peso Est. (PLA): ${fileData.weightGrams.pla.toFixed(2)}g`;
      }
    } else if (context === 'Content Generator') {
      systemPrompt += "Tu tarea es crear contenido viral para redes sociales sobre impresión 3D, enfocado en captación de clientes y engagement.";
    }

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: `${systemPrompt}\n\nUsuario: ${prompt}\n\nAsistente:`,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Ollama connection failed');
    }

    // Proxy the stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.response) {
                controller.enqueue(json.response);
              }
            } catch (e) {
              console.error('Error parsing JSON chunk', e);
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('AI Route Error:', error);
    return new Response(
      JSON.stringify({ error: 'No se pudo conectar con la IA local. Asegúrate de que Ollama esté corriendo con el modelo gemma.' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
