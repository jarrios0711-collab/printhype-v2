import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { ids, action, value } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 })
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('order_registry')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, deleted: ids.length })
    }

    // Actualizar estado masivamente
    const { error } = await supabase
      .from('order_registry')
      .update({ status: action, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (error: any) {
    console.error('Batch error:', error)
    return NextResponse.json({ error: error.message || 'Error en operación por lote' }, { status: 500 })
  }
}
