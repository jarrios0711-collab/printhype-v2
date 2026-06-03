import { login, signup } from './actions'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default async function LoginPage(props: { searchParams?: Promise<{ error?: string; message?: string }> }) {
  const searchParams = await props.searchParams
  const error = searchParams?.error
  const message = searchParams?.message

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#050505]">
      <div className="w-full max-w-md p-8 bg-neutral-900/50 border border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,102,0,0.3)]">
            <span className="text-3xl font-black text-black">P</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Print<span className="text-brand-orange">Hype</span></h1>
          <p className="text-neutral-500 text-sm mt-1">SaaS de Gestión JR3D</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            {message}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none transition-all text-white text-sm placeholder-neutral-600"
              placeholder="admin@jr3d.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Contraseña</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none transition-all text-white text-sm placeholder-neutral-600"
              placeholder="••••••••"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              title="Iniciar sesión con tu cuenta JR3D"
              className="flex-1 py-3 bg-brand-orange hover:bg-orange-600 font-black text-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,102,0,0.2)]"
            >
              Ingresar
            </button>
            <button
              type="submit"
              formAction={signup}
              title="Crear una cuenta nueva en PrintHype"
              className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 font-black text-neutral-300 text-xs uppercase tracking-widest rounded-xl transition-all border border-neutral-700 hover:border-brand-orange/50"
            >
              Crear Cuenta
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-600 font-medium">
            Panel de gestión — <span className="text-brand-orange font-bold">JR3D</span>
          </p>
        </div>
      </div>
    </div>
  )
}
