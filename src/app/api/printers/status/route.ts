import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { queryMoonraker } from '@/lib/moonraker'

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data: printers, error } = await supabase
      .from('impresoras')
      .select('*')
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
