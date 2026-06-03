import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { queryMoonraker } from '@/lib/moonraker'

const PrinterSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
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
    const { name } = PrinterSchema.parse(body)

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('impresoras')
      .insert([{ name, status: 'online' }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
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

    const { data, error } = await supabase
      .from('impresoras')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
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
