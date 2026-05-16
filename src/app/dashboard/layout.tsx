'use client'

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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ParticleBackground from '@/components/ui/ParticleBackground'

const navItems = [
    { name: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Inventario', href: '/dashboard/inventory', icon: Layers },
    { name: 'AI Lab', href: '/dashboard/ai-lab', icon: Cpu },
    { name: 'Viral Cockpit', href: '/dashboard/viral', icon: Video },
    { name: 'Proyectos', href: '/dashboard/projects', icon: Briefcase },
    { name: 'Ajustes', href: '/dashboard/settings', icon: Settings },
]

function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="w-64 border-r border-neutral-900 flex flex-col bg-black/40 backdrop-blur-2xl sticky top-0 h-screen">
            <div className="p-6">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center font-black text-black text-sm">P</div>
                    <span className="text-lg font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 group-hover:to-brand-orange transition-all">
                        PRINTHYPE
                    </span>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link 
                            key={item.name} 
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group border',
                                isActive 
                                    ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20' 
                                    : 'text-neutral-500 hover:bg-neutral-900 hover:text-white border-transparent'
                            )}
                        >
                            <item.icon size={18} className={isActive ? 'text-brand-orange' : 'text-neutral-600 group-hover:text-white'} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-5 mt-auto border-t border-neutral-900">
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange to-brand-cyan flex items-center justify-center text-black font-bold text-sm">A</div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#050505] animate-pulse"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate">admin@jr3d.com</p>
                        <span className="inline-block px-2 py-0.5 bg-brand-orange/10 text-brand-orange text-[9px] font-black rounded-full border border-brand-orange/20 uppercase tracking-widest">
                            JR3D PRO
                        </span>
                    </div>
                </div>

                <form action={logout}>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all text-xs font-bold group">
                        <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        CERRAR SESIÓN
                    </button>
                </form>
            </div>
        </aside>
    )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#050505] text-white">
            <ParticleBackground />
            <Sidebar />
            <main className="flex-1 relative z-10">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-orange/5 blur-[150px] rounded-full pointer-events-none"></div>
                <div className="p-6 sm:p-10">
                    {children}
                </div>
            </main>
        </div>
    )
}
