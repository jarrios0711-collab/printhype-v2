import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { queryMoonraker } from '@/lib/moonraker'

const PrinterSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip_address: z.string().optional().default(''),
  port: z.number().optional().default(7125),
})

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data: printers, error } = await supabase
      .from('impresoras')
      .select('*')
      .order('created_at', { ascending: true })

    if (error && error.code !== '42P01') throw error

    return NextResponse.json(printers || [])
  } catch (error) {
    console.error('GET /api/printers error:', error)
    return NextResponse.json({ error: 'Error al cargar impresoras' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, ip_address, port } = PrinterSchema.parse(body)

    const supabase = getServiceClient()
    // Intenta insertar con IP y puerto en la base de datos
    let result = await supabase
      .from('impresoras')
      .insert([{ name, status: 'online', ip_address, port }])
      .select()
      .single()

    // Si las columnas ip_address o port no existen (migración pendiente de correr en remoto)
    if (result.error && result.error.code === '42703') {
      console.warn('Fallback: ip_address o port no existen en la tabla. Insertando sin ellos.')
      result = await supabase
        .from('impresoras')
        .insert([{ name, status: 'online' }])
        .select()
        .single()
    }

    if (result.error) throw result.error
    return NextResponse.json(result.data)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/printers error:', error)
    return NextResponse.json({ error: 'Error al agregar impresora' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, ip_address, port, name } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const supabase = getServiceClient()
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (ip_address !== undefined) updates.ip_address = ip_address
    if (port !== undefined) updates.port = port

    let result = await supabase
      .from('impresoras')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    // Si las columnas ip_address o port no existen, actualiza de forma segura ignorándolas
    if (result.error && result.error.code === '42703') {
      console.warn('Fallback: ip_address o port no existen en la tabla. Actualizando de forma segura.')
      const safeUpdates: any = {}
      if (name !== undefined) safeUpdates.name = name
      result = await supabase
        .from('impresoras')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single()
    }

    if (result.error) throw result.error
    return NextResponse.json(result.data)
  } catch (error: any) {
    console.error('PATCH /api/printers error:', error)
    return NextResponse.json({ error: 'Error al actualizar impresora' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const supabase = getServiceClient()
    const { error } = await supabase.from('impresoras').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/printers error:', error)
    return NextResponse.json({ error: 'Error al eliminar impresora' }, { status: 500 })
  }
}
