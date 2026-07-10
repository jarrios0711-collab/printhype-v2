import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CampaignSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  platform: z.enum(['Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn']).default('Instagram'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'LIVE']).default('DRAFT'),
  contentIdea: z.string().optional().default(''),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: campaigns, error } = await supabase
      .from('viral_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json((campaigns || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      status: c.status,
      views: c.views || '-',
      reach: c.reach || '-',
      contentIdea: c.content_idea || '',
      createdAt: c.created_at,
    })))
  } catch (error) {
    console.error('GET /api/viral error:', error)
    return NextResponse.json({ error: 'Error al cargar campañas' }, { status: 500 })
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
    const parsed = CampaignSchema.parse(body)

    const { data, error } = await supabase
      .from('viral_campaigns')
      .insert([{
        user_id: user.id,
        title: parsed.title,
        platform: parsed.platform,
        status: parsed.status,
        content_idea: parsed.contentIdea,
      }])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({
      id: data.id,
      title: data.title,
      platform: data.platform,
      status: data.status,
      views: data.views || '-',
      reach: data.reach || '-',
      contentIdea: data.content_idea || '',
      createdAt: data.created_at,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/viral error:', error)
    return NextResponse.json({ error: 'Error al crear campaña' }, { status: 500 })
  }
}
