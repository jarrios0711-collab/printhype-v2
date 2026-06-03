import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  platform: z.enum(['Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn']).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'LIVE']).optional(),
  contentIdea: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = UpdateSchema.parse(body)

    const updateData: Record<string, any> = {}
    if (parsed.title !== undefined) updateData.title = parsed.title
    if (parsed.platform !== undefined) updateData.platform = parsed.platform
    if (parsed.status !== undefined) updateData.status = parsed.status
    if (parsed.contentIdea !== undefined) updateData.content_idea = parsed.contentIdea

    const admin = getServiceClient()
    const { data, error } = await admin
      .from('viral_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

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
    console.error('PATCH /api/viral/[id] error:', error)
    return NextResponse.json({ error: 'Error al actualizar campaña' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getServiceClient()
    const { error } = await admin
      .from('viral_campaigns')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/viral/[id] error:', error)
    return NextResponse.json({ error: 'Error al eliminar campaña' }, { status: 500 })
  }
}
