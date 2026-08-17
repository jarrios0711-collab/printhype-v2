import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PrinterSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip_address: z.string().optional().default(''),
  port: z.number().optional().default(7125),
  // Perfil de costos para la calculadora
  purchasePrice: z.number().min(0).optional().default(0),
  lifetimeHours: z.number().min(0).optional().default(12000),
  powerWatts: z.number().min(0).optional().default(250),
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

    return NextResponse.json((printers || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      ip_address: p.ip_address || '',
      port: p.port ?? 7125,
      purchasePrice: Number(p.purchase_price ?? 0),
      lifetimeHours: Number(p.lifetime_hours ?? 12000),
      powerWatts: Number(p.power_watts ?? 250),
      created_at: p.created_at,
    })))
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
    const { name, ip_address, port, purchasePrice, lifetimeHours, powerWatts } = PrinterSchema.parse(body)

    let result = await supabase
      .from('impresoras')
      .insert([{
        name,
        status: 'online',
        ip_address,
        port,
        purchase_price: purchasePrice,
        lifetime_hours: lifetimeHours,
        power_watts: powerWatts,
        user_id: user.id,
      }])
      .select()
      .single()

    if (result.error && result.error.code === '42703') {
      console.warn('Fallback: ip_address, port o perfil de costos no existen en la tabla. Insertando sin ellos.')
      result = await supabase
        .from('impresoras')
        .insert([{ name, status: 'online', user_id: user.id }])
        .select()
        .single()
    }

    if (result.error) throw result.error
    return NextResponse.json({
      id: result.data.id,
      name: result.data.name,
      status: result.data.status,
      ip_address: result.data.ip_address || '',
      port: result.data.port ?? 7125,
      purchasePrice: Number(result.data.purchase_price ?? 0),
      lifetimeHours: Number(result.data.lifetime_hours ?? 12000),
      powerWatts: Number(result.data.power_watts ?? 250),
      created_at: result.data.created_at,
    })
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
    const { id, ip_address, port, name, purchasePrice, lifetimeHours, powerWatts } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (ip_address !== undefined) updates.ip_address = ip_address
    if (port !== undefined) updates.port = port
    if (purchasePrice !== undefined) updates.purchase_price = purchasePrice
    if (lifetimeHours !== undefined) updates.lifetime_hours = lifetimeHours
    if (powerWatts !== undefined) updates.power_watts = powerWatts

    let result = await supabase
      .from('impresoras')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (result.error && result.error.code === '42703') {
      console.warn('Fallback: ip_address, port o perfil de costos no existen en la tabla.')
      const safeUpdates: any = {}
      if (name !== undefined) safeUpdates.name = name
      if (ip_address !== undefined) safeUpdates.ip_address = ip_address
      if (port !== undefined) safeUpdates.port = port
      result = await supabase
        .from('impresoras')
        .update(safeUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
    }

    if (result.error) throw result.error
    return NextResponse.json({
      id: result.data.id,
      name: result.data.name,
      status: result.data.status,
      ip_address: result.data.ip_address || '',
      port: result.data.port ?? 7125,
      purchasePrice: Number(result.data.purchase_price ?? 0),
      lifetimeHours: Number(result.data.lifetime_hours ?? 12000),
      powerWatts: Number(result.data.power_watts ?? 250),
      created_at: result.data.created_at,
    })
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
