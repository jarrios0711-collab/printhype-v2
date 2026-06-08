import { login, signup, loginGuest } from './actions'
import { AlertCircle, CheckCircle2, KeyRound, UserPlus, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default async function LoginPage(props: { searchParams?: Promise<{ error?: string; message?: string; tab?: string; invite?: string }> }) {
  const searchParams = await props.searchParams
  const error = searchParams?.error
  const message = searchParams?.message
  const tab = searchParams?.tab || 'login' // 'login' o 'signup'
  const invite = searchParams?.invite || '' // Código de invitación pre-cargado

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#050505] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#FF6600_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-orange/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md p-8 glass-card rounded-3xl shadow-2xl relative z-10 border border-white/5">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,102,0,0.35)]">
            <span className="text-3xl font-black text-black">P</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Print<span className="text-brand-orange">Hype</span></h1>
          <p className="text-secondary text-sm mt-1">SaaS de Gestión JR3D</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-semibold leading-relaxed">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex p-1 bg-black/40 border border-neutral-900 rounded-xl mb-6">
          <Link
            href={`/login?tab=login${invite ? `&invite=${invite}` : ''}`}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              tab === 'login' ? 'bg-neutral-800 text-brand-orange' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Iniciar Sesión
          </Link>
          <Link
            href={`/login?tab=signup${invite ? `&invite=${invite}` : ''}`}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              tab === 'signup' ? 'bg-neutral-800 text-brand-orange' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Registrarse
          </Link>
        </div>

        {tab === 'login' ? (
          <form action={login} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-neutral-900/60 border border-neutral-800 focus:border-brand-orange rounded-xl outline-none transition-all text-white text-sm placeholder-neutral-700"
                placeholder="admin@jr3d.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-neutral-900/60 border border-neutral-800 focus:border-brand-orange rounded-xl outline-none transition-all text-white text-sm placeholder-neutral-700"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              title="Iniciar sesión con tu cuenta"
              className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 font-black text-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,102,0,0.2)] flex items-center justify-center gap-2"
            >
              <KeyRound size={14} /> Ingresar
            </button>
          </form>
        ) : (
          <form action={signup} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-neutral-900/60 border border-neutral-800 focus:border-brand-orange rounded-xl outline-none transition-all text-white text-sm placeholder-neutral-700"
                placeholder="nuevo@taller3d.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-neutral-900/60 border border-neutral-800 focus:border-brand-orange rounded-xl outline-none transition-all text-white text-sm placeholder-neutral-700"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest">Código de Invitación</label>
                <span className="text-[9px] text-neutral-500 lowercase font-medium flex items-center gap-0.5">
                  <HelpCircle size={10} /> opcional
                </span>
              </div>
              <input
                name="invitationToken"
                type="text"
                defaultValue={invite}
                className="w-full px-4 py-3 bg-neutral-900/60 border border-neutral-800 focus:border-brand-orange rounded-xl outline-none transition-all text-white text-sm placeholder-neutral-700 font-mono"
                placeholder="Ingresá tu código si tenés uno"
              />
            </div>
            <button
              type="submit"
              title="Registrar nueva cuenta en PrintHype"
              className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 font-black text-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,102,0,0.2)] flex items-center justify-center gap-2"
            >
              <UserPlus size={14} /> Registrarse
            </button>
          </form>
        )}

        <div className="mt-4 pt-2">
          <form action={loginGuest}>
            <button
              type="submit"
              title="Probar la app al instante sin ingresar credenciales"
              className="w-full py-3 bg-brand-cyan hover:bg-cyan-400 font-black text-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] shadow-[0_0_20px_rgba(0,242,255,0.2)]"
            >
              Entrar como Invitado (Testeo Rápido)
            </button>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-900 text-center">
          <p className="text-xs text-neutral-600 font-medium">
            Panel de gestión — <span className="text-brand-orange font-bold">JR3D</span>
          </p>
        </div>
      </div>
    </div>
  )
}
