'use client'

import { useEffect, useState } from 'react'
import { logout } from '../login/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    ShoppingBag,
    Layers,
    Cpu,
    Video,
    Briefcase,
    Settings,
    LogOut,
    Menu,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ParticleBackground from '@/components/ui/ParticleBackground'
import Tooltip from '@/components/ui/Tooltip'
import { createClient } from '@/lib/supabase/client'

const navItems = [
    { name: 'Resumen', href: '/dashboard', icon: LayoutDashboard, tooltip: 'Panel principal con estadísticas y actividad reciente' },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag, tooltip: 'Gestión de órdenes de producción' },
    { name: 'Inventario', href: '/dashboard/inventory', icon: Layers, tooltip: 'Control de stock de materiales' },
    { name: 'AI Lab', href: '/dashboard/ai-lab', icon: Cpu, tooltip: 'Laboratorio de inteligencia artificial' },
    { name: 'Viral Cockpit', href: '/dashboard/viral', icon: Video, tooltip: 'Marketing y contenido viral' },
    { name: 'Proyectos', href: '/dashboard/projects', icon: Briefcase, tooltip: 'Tablero Kanban de proyectos' },
    { name: 'Ajustes', href: '/dashboard/settings', icon: Settings, tooltip: 'Configuración del taller' },
]

function Sidebar() {
    const pathname = usePathname()
    const [userEmail, setUserEmail] = useState('admin@jr3d.com')
    const [userInitial, setUserInitial] = useState('A')
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.email) {
                setUserEmail(user.email)
                setUserInitial(user.email[0].toUpperCase())
            }
        })
    }, [])

    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    const nav = (
        <nav className="flex-1 px-3 space-y-0.5 lg:space-y-1">
            {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <Tooltip key={item.name} content={item.tooltip} position="right" delay={600}>
                        <Link
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all group border',
                                isActive
                                    ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                                    : 'text-neutral-500 hover:bg-neutral-900 hover:text-white border-transparent'
                            )}
                        >
                            <item.icon size={18} className={isActive ? 'text-brand-orange' : 'text-neutral-600 group-hover:text-white'} />
                            <span className="lg:inline">{item.name}</span>
                        </Link>
                    </Tooltip>
                )
            })}
        </nav>
    )

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all"
                aria-label="Abrir menú"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <aside className={cn(
                'fixed lg:sticky top-0 left-0 z-40 h-full w-72 border-r border-neutral-900 flex flex-col bg-black/90 backdrop-blur-2xl transition-transform duration-300 lg:!translate-x-0',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="p-5 lg:p-6 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center font-black text-black text-sm">P</div>
                        <span className="text-lg font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 group-hover:to-brand-orange transition-all">
                            PRINTHYPE
                        </span>
                    </Link>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-1 text-neutral-500 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {nav}

                <div className="p-4 lg:p-5 mt-auto border-t border-neutral-900">
                    <div className="flex items-center gap-3 mb-3 lg:mb-4">
                        <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange to-brand-cyan flex items-center justify-center text-black font-bold text-sm">{userInitial}</div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#050505] animate-pulse"></div>
                        </div>
                        <div className="flex-1 overflow-hidden min-w-0">
                            <p className="text-xs font-bold truncate">{userEmail}</p>
                            <span className="inline-block px-2 py-0.5 bg-brand-orange/10 text-brand-orange text-[9px] font-black rounded-full border border-brand-orange/20 uppercase tracking-widest">
                                JR3D PRO
                            </span>
                        </div>
                    </div>

                    <form action={logout}>
                        <Tooltip content="Cerrar sesión" position="right" delay={600}>
                            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all text-xs font-bold group">
                                <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                <span className="lg:inline">CERRAR SESIÓN</span>
                            </button>
                        </Tooltip>
                    </form>
                </div>
            </aside>

            {/* Bottom nav (mobile) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-neutral-900 backdrop-blur-xl safe-area-bottom">
                <div className="flex items-center justify-around px-2 py-1">
                    {navItems.slice(0, 5).map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Tooltip key={item.name} content={item.tooltip} position="top" delay={600}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0',
                                        isActive ? 'text-brand-orange' : 'text-neutral-500 hover:text-neutral-300'
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span className="text-[8px] font-bold uppercase tracking-tight leading-tight">{item.name}</span>
                                </Link>
                            </Tooltip>
                        )
                    })}
                    <Tooltip content="Más opciones" position="top" delay={600}>
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-neutral-500 hover:text-neutral-300 transition-all"
                        >
                            <Menu size={20} />
                            <span className="text-[8px] font-bold uppercase tracking-tight leading-tight">Más</span>
                        </button>
                    </Tooltip>
                </div>
            </nav>
        </>
    )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#050505] text-white">
            <ParticleBackground />
            <Sidebar />
            <main className="flex-1 relative z-10 pb-20 lg:pb-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/5 blur-[150px] rounded-full pointer-events-none"></div>
                <div className="p-4 pt-16 sm:p-6 lg:p-10 lg:pt-10 max-w-full overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    )
}
