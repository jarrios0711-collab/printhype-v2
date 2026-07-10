'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log('[login] email:', email, 'password:', password ? '****' : 'vacio')

  if (!email || !password) {
    redirect('/login?error=Completá todos los campos')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  console.log('[login] supabase error:', error)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message || 'Email o contraseña incorrectos')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const invitationToken = formData.get('invitationToken') as string // Nuevo campo opcional

  if (!email || !password) {
    redirect('/login?error=Completá todos los campos&tab=signup')
  }

  if (password.length < 6) {
    redirect('/login?error=La contraseña debe tener al menos 6 caracteres&tab=signup')
  }

  // --- Validación de Invitación si existe la lógica de control especial ---
  const admin = getServiceClient()
  let assignedRole = 'member'

  if (invitationToken) {
    // Buscar si el token de invitación es válido
    const { data: inv, error: invError } = await admin
      .from('user_invitations')
      .select('*')
      .eq('token', invitationToken)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (invError || !inv) {
      redirect('/login?error=El código de invitación es inválido o expiró&tab=signup')
    }

    assignedRole = inv.role
    
    // Marcar invitación como usada
    await admin
      .from('user_invitations')
      .update({ used: true })
      .eq('id', inv.id)
  } else {
    // Si no provee invitación, podés decidir si rebota el registro o lo deja como rol guest
    // Para PrintHype v2, dejamos que se registren como 'guest' por defecto o requerimos invitación
    // Requerir invitación de forma opcional (si no hay invitaciones en la db, se asume miembro)
    const { count } = await admin
      .from('user_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())

    if (count && count > 0) {
      // Si la DB tiene invitaciones activas creadas por el admin, se exige una
      redirect('/login?error=Se requiere un código de invitación activo para registrarse&tab=signup')
    }
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&tab=signup`)
  }

  // Si se crea el usuario con éxito, asignarle su rol especial
  if (data?.user) {
    await admin
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        role: assignedRole
      })
  }

  revalidatePath('/', 'layout')

  if (data?.session) {
    redirect('/dashboard')
  } else {
    redirect('/login?message=Cuenta creada. Por favor, revisá tu correo electrónico para confirmar tu cuenta antes de ingresar.')
  }
}

export async function loginGuest() {
  const supabase = await createClient()

  const email = process.env.GUEST_EMAIL
  const password = process.env.GUEST_PASSWORD

  if (!email || !password) {
    redirect('/login?error=El acceso de invitado no está disponible en este momento')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent('No se pudo iniciar sesión como invitado: ' + error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Logout error:', error)
  redirect('/login')
}
