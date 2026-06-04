import Link from 'next/link'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#050505] relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FF6600_1px,transparent_1px)] [background-size:30px_30px]"></div>

            {/* Glow Orbs */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-orange/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-cyan/10 blur-[120px] rounded-full"></div>

            <div className="relative z-10 text-center space-y-8 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-orange/10 border border-brand-orange/20 rounded-full text-brand-orange text-[10px] font-black uppercase tracking-[0.15em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
                    Sistema Operativo JR3D v2.5
                </div>

                <h1 className="text-6xl sm:text-8xl font-black tracking-tighter">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">Print</span>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-orange-400">Hype</span>
                </h1>

                <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                    Plataforma administrativa para profesionales del 3D.
                    Gestión de pedidos, inventario, producción e inteligencia artificial.
                </p>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        href="/login"
                        className="px-8 py-3.5 bg-brand-orange text-black font-black text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,102,0,0.3)]"
                    >
                        ACCEDER AL PANEL
                    </Link>
                    <Link
                        href="/login?tab=signup"
                        className="px-8 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-sm rounded-xl hover:bg-neutral-800 hover:border-brand-orange/50 transition-all"
                    >
                        CREAR CUENTA
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
            </div>
        </main>
    )
}
