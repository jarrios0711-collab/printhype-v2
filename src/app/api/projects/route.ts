import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  client: z.string().optional().default('General'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  status: z.string().optional().default('idea'),
  dueDate: z.string().optional().nullable(),
})

const UpdateProjectSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: projects, error } = await supabase
      .from('project_board')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(
      (projects || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        client: p.client || 'General',
        status: p.status || 'idea',
        priority: p.priority || 'medium',
        dueDate: p.due_date,
        progress: p.progress || 0,
      }))
    )
  } catch (error) {
    console.error('GET /api/projects error:', error)
    return NextResponse.json({ error: 'Error al cargar proyectos' }, { status: 500 })
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
    const { id, status } = UpdateProjectSchema.parse(body)

    const { data, error } = await supabase
      .from('project_board')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('PATCH /api/projects error:', error)
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 })
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
    const parsed = CreateProjectSchema.parse(body)

    const { data, error } = await supabase
      .from('project_board')
      .insert([{
        title: parsed.title,
        client: parsed.client,
        priority: parsed.priority,
        status: parsed.status,
        due_date: parsed.dueDate || null,
        progress: 0,
        user_id: user.id,
      }])
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('POST /api/projects error:', error)
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}
