import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const ProfileSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.string().min(1, 'Tipo requerido'),
  nozzleTemp: z.number().min(0).default(210),
  bedTemp: z.number().min(0).default(60),
  brand: z.string().optional().default(''),
  color: z.string().optional().default('#FF6600'),
})

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data: profiles, error } = await supabase
      .from('filament_profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(profiles || [])
  } catch (error) {
    console.error('GET /api/filament-profiles error:', error)
    return NextResponse.json({ error: 'Error al cargar perfiles' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ProfileSchema.parse(body)

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('filament_profiles')
      .insert([{
        name: parsed.name,
        type: parsed.type,
        nozzle_temp: parsed.nozzleTemp,
        bed_temp: parsed.bedTemp,
        brand: parsed.brand,
        color: parsed.color,
      }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/filament-profiles error:', error)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const supabase = getServiceClient()
    const { error } = await supabase.from('filament_profiles').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/filament-profiles error:', error)
    return NextResponse.json({ error: 'Error al eliminar perfil' }, { status: 500 })
  }
}
