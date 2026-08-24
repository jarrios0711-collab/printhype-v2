import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PLANS, PLAN_IDS } from '@/config/plans'
import { formatMoney } from '@/lib/costCalculator'

export const dynamic = 'force-dynamic'

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Creá tu cuenta',
    text: 'Registrate en menos de un minuto, sin tarjeta. Empezás con 7 días de prueba con todo el plan Pro incluido.',
  },
  {
    step: '2',
    title: 'Cargá tu taller',
    text: 'Agregá impresoras, filamento e insumos. La calculadora de costos arma tu precio con material, energía, mano de obra y margen real.',
  },
  {
    step: '3',
    title: 'Cobrá y seguí',
    text: 'Del presupuesto al pedido, del pedido a la cola de impresión. Tu cliente sigue el estado por un link público.',
  },
]

const FAQ = [
  {
    q: '¿Necesito saber de tecnología?',
    a: 'No. Funciona desde el navegador, también en el celular. Te registrás, verificás tu email y empezás a usarlo en una tarde.',
  },
  {
    q: '¿Funciona con cualquier impresora?',
    a: 'Sí. Monitoreo en vivo para impresoras con Moonraker/Klipper, y cola de impresión manual para cualquier otra marca (Bambu, Creality, Prusa, Elegoo…).',
  },
  {
    q: '¿Cuánto cuesta después de la prueba?',
    a: 'Tres opciones: Free ($0 para siempre, con límites), Basic (≈ USD 10/mes) o Pro (≈ USD 15/mes de lanzamiento). El cobro es en pesos vía MercadoPago con la cotización del día.',
  },
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí. Sin permanencia ni penalizaciones. Cancelás desde tu panel y seguís usando la app hasta el final del período ya pagado.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const ctaBase = user ? '/dashboard/billing' : '/login?tab=signup'

  return (
    <main className="min-h-screen bg-[#050505] relative overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FF6600_1px,transparent_1px)] [background-size:30px_30px]"></div>

      {/* Glow Orbs */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-brand-orange/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-brand-cyan/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* ───────────── HERO ───────────── */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8 text-center space-y-8 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-orange/10 border border-brand-orange/20 rounded-full text-brand-orange text-[10px] font-black uppercase tracking-[0.15em]">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
          Hecho por makers, para makers
        </div>

        <h1 className="text-6xl sm:text-8xl font-black tracking-tighter">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">Print</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-orange-400">Hype</span>
        </h1>

        <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Ordená tu taller de impresión 3D en una tarde.
          Presupuestos con margen real, pedidos → cola de impresión, stock auditable e IA.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-8 py-3.5 bg-brand-orange text-black font-black text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,102,0,0.3)]"
          >
            ACCEDER AL PANEL
          </Link>
          <Link
            href={ctaBase}
            className="px-8 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-sm rounded-xl hover:bg-neutral-800 hover:border-brand-orange/50 transition-all"
          >
            {user ? 'VER MI PLAN' : 'CREAR CUENTA'}
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-3 gap-8 max-w-xl mx-auto">
          {[
            { label: 'Pedidos', value: 'Gestión' },
            { label: 'Inventario', value: 'Stock' },
            { label: 'AI Lab', value: 'Ollama' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-brand-orange text-sm font-black uppercase tracking-widest">{item.value}</div>
              <div className="text-neutral-600 text-[10px] font-bold uppercase mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── PLANES ───────────── */}
      <section id="planes" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">Planes y precios</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase mt-2">Elegí tu plan</h2>
          <p className="text-neutral-500 text-sm mt-3 max-w-xl mx-auto">
            Empezá gratis — 7 días con todo incluido, sin tarjeta. El cobro es en pesos vía MercadoPago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_IDS.map((pid) => {
            const plan = PLANS[pid]
            const recommended = pid === 'PRO'
            return (
              <div
                key={pid}
                className={`glass-card rounded-2xl p-8 relative flex flex-col border ${recommended ? 'border-brand-orange/40' : 'border-neutral-800/60'}`}
              >
                {recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-orange text-black text-[9px] font-black rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(255,102,0,0.4)]">
                    Recomendado
                  </span>
                )}
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{plan.name}</div>
                <div className="text-4xl font-black mt-3">
                  {plan.priceARS === 0 ? 'Gratis' : formatMoney(plan.priceARS, 'ARS')}
                  {plan.priceARS > 0 && <span className="text-neutral-500 text-sm font-bold align-middle ml-1">/mes</span>}
                </div>
                <div className="text-neutral-600 text-[11px] font-bold mt-1 uppercase">para siempre</div>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-400">
                      <span className="text-brand-orange font-black leading-none mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={pid === 'FREE' ? '/login?tab=signup' : ctaBase}
                  className={`mt-8 w-full text-center py-3.5 font-black text-xs rounded-xl transition-all ${
                    recommended
                      ? 'bg-brand-orange text-black hover:scale-105 shadow-[0_0_20px_rgba(255,102,0,0.2)]'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-brand-orange/50'
                  }`}
                >
                  {pid === 'FREE' ? 'EMPEZAR GRATIS' : user ? 'MEJORAR MI PLAN' : 'CREAR CUENTA'}
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* ───────────── CÓMO FUNCIONA ───────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-cyan">Cómo funciona</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase mt-2">En tres pasos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((h) => (
            <div key={h.step} className="glass-card rounded-2xl p-6 border border-neutral-800/60">
              <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-black text-lg">
                {h.step}
              </div>
              <div className="font-black uppercase text-sm mt-4 tracking-wide">{h.title}</div>
              <p className="text-neutral-500 text-sm mt-2 leading-relaxed">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Preguntas frecuentes</div>
          <h2 className="text-3xl font-black tracking-tight uppercase mt-2">Dudas comunes</h2>
        </div>
        <div className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.q} className="glass-card rounded-xl p-5 border border-neutral-800/60">
              <div className="font-bold text-sm">{f.q}</div>
              <p className="text-neutral-500 text-sm mt-2 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── CTA FINAL ───────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
          ¿Listo para dejar de <span className="text-brand-orange">improvisar</span>?
        </h2>
        <p className="text-neutral-500 text-sm mt-4 max-w-lg mx-auto">
          Activá 7 días de Pro con todo incluido, sin tarjeta. Si te sirve, elegís tu plan. Si no, seguís con Free.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link
            href={ctaBase}
            className="px-10 py-4 bg-brand-orange text-black font-black text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,102,0,0.3)]"
          >
            EMPEZAR PRUEBA GRATIS
          </Link>
        </div>
      </section>

      {/* ───────────── FOOTER ───────────── */}
      <footer className="relative z-10 border-t border-neutral-900 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-black tracking-tight">
            <span className="text-neutral-300">PRINT</span>
            <span className="text-brand-orange">HYPE</span>
          </div>
          <div className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
            © 2026 PrintHype · Hecho en Argentina, pensado para LATAM
          </div>
        </div>
      </footer>
    </main>
  )
}
