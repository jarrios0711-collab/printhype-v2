import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryMoonraker } from '@/lib/moonraker'

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

    if (error) throw error

    const statuses = await Promise.all(
      (printers || [])
        .filter(p => p.ip_address)
        .map(async (p) => {
          const status = await queryMoonraker(p.ip_address, p.port || 7125)
          return {
            id: p.id,
            name: p.name,
            ip_address: p.ip_address,
            port: p.port,
            ...status,
          }
        })
    )

    return NextResponse.json({ printers: statuses })
  } catch (error) {
    console.error('GET /api/printers/status error:', error)
    return NextResponse.json({ error: 'Error al consultar estado' }, { status: 500 })
  }
}
