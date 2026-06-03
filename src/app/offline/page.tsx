import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FF6600_1px,transparent_1px)] [background-size:30px_30px]"></div>
      <div className="relative z-10 text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto">
          <span className="text-4xl font-black text-brand-orange">P</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Sin Conexión</h1>
        <p className="text-neutral-500 text-sm leading-relaxed">
          No tenés internet en este momento. PrintHype necesita conexión para funcionar.
          Revisá tu red e intentá de nuevo.
        </p>
        <div className="h-px bg-neutral-900 max-w-xs mx-auto"></div>
        <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
          Los datos se sincronizarán cuando vuelvas a estar online
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-brand-orange text-black font-black text-xs rounded-xl hover:scale-105 transition-all"
        >
          REINTENTAR
        </Link>
      </div>
    </main>
  )
}
