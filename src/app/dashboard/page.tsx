'use client'

import { useEffect, useState } from 'react'
import {
    Zap, ShoppingCart, TrendingUp, Activity, AlertTriangle,
    BrainCircuit, ChevronRight, Search, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
    const [userName, setUserName] = useState('admin')
    const [stats, setStats] = useState({ orders: 0, printers: 0, lowStock: 0 })
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.email) {
                    setUserName(user.email.split('@')[0])
                }

                const [ordersRes, printersRes] = await Promise.allSettled([
                    fetch('/api/orders').then(r => r.json()),
                    fetch('/api/printers').then(r => r.json()),
                ])

                const orders = ordersRes.status === 'fulfilled' && !ordersRes.value.error ? ordersRes.value : []
                const printers = printersRes.status === 'fulfilled' && !printersRes.value.error ? printersRes.value : []

                const today = new Date(); today.setHours(0,0,0,0)
                const ordersToday = orders.filter((o: any) => new Date(o.createdAt) >= today).length

                setStats({ orders: ordersToday, printers: printers.length, lowStock: 0 })
                setRecentActivity(orders.slice(0, 5))
            } catch (e) {
                console.error('Dashboard load error:', e)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const statCards = [
        { label: 'PEDIDOS HOY', value: String(stats.orders), sub: 'recibidos', icon: ShoppingCart, color: 'text-brand-cyan' },
        { label: 'RETORNO (ROI)', value: '2.8x', sub: 'Promedio taller', icon: TrendingUp, color: 'text-green-500' },
        { label: 'IMPRESORAS', value: String(stats.printers), sub: 'registradas', icon: Activity, color: 'text-brand-orange' },
        { label: 'STOCK CRÍTICO', value: String(stats.lowStock), sub: 'bajo mínimo', icon: Zap, color: 'text-yellow-500' },
    ]

    return (
        <div className="space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-orange text-xs font-black uppercase tracking-[0.2em]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></div>
                        Sistema Operativo JR3D v2.5
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
                        Buenos días, <span className="text-brand-orange">{userName}</span>
                    </h1>
                </div>
                <div className="relative">
                    <input type="text" placeholder="Buscar..." className="bg-black/40 border border-neutral-800 rounded-xl px-4 py-2 pl-10 text-xs focus:outline-none focus:border-brand-orange/50 transition-all w-56" />
                    <Search className="absolute left-3 top-2.5 text-neutral-600" size={14} />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {statCards.map((stat, i) => (
                    <div key={i} className="bg-neutral-950/40 border border-neutral-900 p-5 sm:p-6 rounded-3xl hover:border-neutral-700 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <stat.icon size={56} className={stat.color} />
                        </div>
                        <div className="text-[9px] font-black tracking-widest mb-1 uppercase text-neutral-500">{stat.label}</div>
                        <div className="text-3xl sm:text-4xl font-black mb-1 text-white">
                            {isLoading ? <span className="text-neutral-700 animate-pulse">—</span> : stat.value}
                        </div>
                        <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-tighter">{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-base sm:text-xl font-bold flex items-center gap-3">
                                <Activity className="text-brand-orange" size={20} />
                                Actividad Reciente
                            </h2>
                            <Link href="/dashboard/orders" className="text-neutral-500 text-xs hover:text-white transition-colors flex items-center gap-1 font-bold">
                                VER TODO <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {isLoading ? (
                                <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest p-10 text-center animate-pulse">Cargando datos...</p>
                            ) : recentActivity.length === 0 ? (
                                <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest p-10 text-center">No hay pedidos aún. ¡Cargá el primero!</p>
                            ) : recentActivity.map((order: any) => (
                                <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-10 rounded-full bg-neutral-800 overflow-hidden">
                                            <div className={cn("w-full h-full", order.status === 'COMPLETED' ? 'bg-green-500' : 'bg-brand-orange')}></div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-brand-orange transition-colors">
                                                {order.customerName}: {order.items?.[0]?.projectName || 'Pedido'}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase">
                                                {new Date(order.createdAt).toLocaleDateString()} · ${Number(order.totalPrice).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase hidden sm:block",
                                        order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-brand-orange/10 text-brand-orange')}>
                                        {order.status}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-brand-orange/20 to-brand-cyan/10 border border-brand-orange/20 rounded-3xl p-6 sm:p-8 hover:border-brand-orange/50 transition-all">
                        <div className="flex items-center gap-2 text-brand-orange mb-4">
                            <BrainCircuit size={20} className="animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest">IA BRIEFING</span>
                        </div>
                        <h3 className="text-base font-bold leading-tight mb-4 text-white">
                            "Seguí cargando pedidos para calcular el ROI real de tu taller."
                        </h3>
                        <Link href="/dashboard/ai-lab" className="block w-full py-3 bg-black/40 hover:bg-black/60 rounded-xl text-xs font-bold border border-white/5 transition-all text-neutral-300 text-center">
                            ABRIR LAB IA
                        </Link>
                    </div>

                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-6 text-white">
                            <AlertTriangle className="text-yellow-500" size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">STOCK CRÍTICO</h3>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span className="text-[10px] font-black text-green-500/80 uppercase">Revisá en Inventario</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
