import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PrinterSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip_address: z.string().optional().default(''),
  port: z.number().optional().default(7125),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: printers, error } = await supabase
      .from('impresoras')
      .select('*')
      .eq('user_id', user.id)
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { name, ip_address, port } = PrinterSchema.parse(body)

    let result = await supabase
      .from('impresoras')
      .insert([{ name, status: 'online', ip_address, port, user_id: user.id }])
      .select()
      .single()

    if (result.error && result.error.code === '42703') {
      console.warn('Fallback: ip_address o port no existen en la tabla. Insertando sin ellos.')
      result = await supabase
        .from('impresoras')
        .insert([{ name, status: 'online', user_id: user.id }])
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ip_address, port, name } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (ip_address !== undefined) updates.ip_address = ip_address
    if (port !== undefined) updates.port = port

    let result = await supabase
      .from('impresoras')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (result.error && result.error.code === '42703') {
      console.warn('Fallback: ip_address o port no existen en la tabla.')
      const safeUpdates: any = {}
      if (name !== undefined) safeUpdates.name = name
      result = await supabase
        .from('impresoras')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const { error } = await supabase
      .from('impresoras')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/printers error:', error)
    return NextResponse.json({ error: 'Error al eliminar impresora' }, { status: 500 })
  }
}
