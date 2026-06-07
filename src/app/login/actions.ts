'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  if (!email || !password) {
    redirect('/login?error=Completá todos los campos')
  }

  if (password.length < 6) {
    redirect('/login?error=La contraseña debe tener al menos 6 caracteres')
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
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

  const email = 'invitado@jr3d.com'
  const password = 'invitadotesteo'

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
