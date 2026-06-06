'use client'

import { useEffect, useState, useMemo } from 'react'
import {
    Zap, ShoppingCart, TrendingUp, Activity, AlertTriangle,
    BrainCircuit, ChevronRight, Search, CheckCircle2,
    Thermometer, Printer, Wifi, WifiOff, Clock, X,
    Settings, Package, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Tooltip from '@/components/ui/Tooltip'

interface PrinterStatus {
    id: string
    name: string
    ip_address: string
    port: number
    online: boolean
    temperature?: { nozzle: number; bed: number }
    print?: { state: string; filename: string; progress: number }
}

/* ─── Helpers ─── */
function getGreeting() {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return 'Buenos días'
    if (h >= 12 && h < 19) return 'Buenas tardes'
    return 'Buenas noches'
}

function buildAIBriefing(
    lowStockItems: any[],
    pendingOrders: number,
    monthRevenue: number,
    totalOrders: number
): string {
    if (totalOrders === 0) {
        return 'Todavía no hay pedidos registrados. Cargá tu primer pedido para que pueda analizar el rendimiento de tu taller y darte insights reales. 🚀'
    }
    const parts: string[] = []
    if (lowStockItems.length > 0) {
        const names = lowStockItems.slice(0, 2).map((m: any) => m.name).join(' y ')
        parts.push(`⚠ Stock crítico en ${names}${lowStockItems.length > 2 ? ` y ${lowStockItems.length - 2} más` : ''} — considerá reponer antes de aceptar nuevos pedidos.`)
    }
    if (pendingOrders > 0) {
        parts.push(`📋 Tenés ${pendingOrders} pedido${pendingOrders !== 1 ? 's' : ''} pendiente${pendingOrders !== 1 ? 's' : ''} en producción.`)
    }
    if (monthRevenue === 0 && totalOrders > 0) {
        parts.push('📊 Sin facturación este mes. Revisá si hay pedidos anteriores para completar.')
    }
    if (parts.length === 0) {
        return '✅ Todo en orden. Stock OK, pedidos al día y facturación activa. ¡Seguí así!'
    }
    return parts.join(' ')
}

/* ─── Billing chart for last 6 months ─── */
function BillingChart({ orders, fmt }: { orders: any[]; fmt: (n: number) => string }) {
    const months = useMemo(() => {
        const result: { label: string; total: number; key: string }[] = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${d.getMonth()}`
            const label = d.toLocaleDateString('es-AR', { month: 'short' })
            const total = orders
                .filter((o: any) => {
                    const od = new Date(o.createdAt)
                    return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
                })
                .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)
            result.push({ label, total, key })
        }
        return result
    }, [orders])

    const maxVal = Math.max(...months.map(m => m.total), 1)
    const hasData = months.some(m => m.total > 0)

    return (
        <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-base sm:text-xl font-bold flex items-center gap-3">
                    <BarChart3 className="text-brand-cyan" size={20} />
                    Facturación — últimos 6 meses
                </h2>
            </div>
            {!hasData ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <BarChart3 size={36} className="text-neutral-800" />
                    <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest text-center">
                        El gráfico aparecerá cuando tengas pedidos completados
                    </p>
                </div>
            ) : (
                <div className="flex items-end gap-2 sm:gap-3 h-32">
                    {months.map((m) => (
                        <Tooltip key={m.key} content={m.total > 0 ? `${m.label}: ${fmt(m.total)}` : `${m.label}: sin pedidos`}>
                            <div className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                                <div className="w-full relative flex items-end justify-center" style={{ height: '96px' }}>
                                    <div
                                        className={cn(
                                            'w-full rounded-t-lg transition-all duration-500',
                                            m.total > 0
                                                ? 'bg-gradient-to-t from-brand-orange to-brand-orange/60 group-hover:from-brand-orange group-hover:to-orange-400'
                                                : 'bg-neutral-900'
                                        )}
                                        style={{ height: m.total > 0 ? `${Math.max((m.total / maxVal) * 96, 4)}px` : '4px' }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-neutral-500 uppercase group-hover:text-neutral-300 transition-colors">
                                    {m.label}
                                </span>
                            </div>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function DashboardPage() {
    const [userName, setUserName] = useState<string | null>(null)
    const [allOrders, setAllOrders] = useState<any[]>([])
    const [stats, setStats] = useState({ orders: 0, printers: 0, lowStock: 0, completedRevenue: 0, totalRevenue: 0, monthRevenue: 0, activeOrders: 0 })
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [lowStockItems, setLowStockItems] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEmpty, setIsEmpty] = useState<{ orders: boolean; printers: boolean; inventory: boolean } | null>(null)
    const [onboardingDismissed, setOnboardingDismissed] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [settings, setSettings] = useState<any>(null)
    const [pendingOrders, setPendingOrders] = useState(0)

    useEffect(() => {
        const dismissed = localStorage.getItem('ph_onboarding_dismissed')
        if (dismissed === 'true') setOnboardingDismissed(true)
    }, [])

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.email) {
                    // Use display name if set, otherwise prefix of email (but not "admin")
                    const emailPrefix = user.email.split('@')[0]
                    setUserName(emailPrefix === 'admin' ? null : emailPrefix)
                }

                const [ordersRes, printersRes, inventoryRes, settingsRes] = await Promise.allSettled([
                    fetch('/api/orders').then(r => r.json()),
                    fetch('/api/printers').then(r => r.json()),
                    fetch('/api/inventory').then(r => r.json()),
                    fetch('/api/settings').then(r => r.json()),
                ])

                const orders = ordersRes.status === 'fulfilled' && !ordersRes.value.error ? ordersRes.value : []
                const printers = printersRes.status === 'fulfilled' && !printersRes.value.error ? printersRes.value : []
                const inventory = inventoryRes.status === 'fulfilled' && !inventoryRes.value.error ? inventoryRes.value : []
                const settingsData = settingsRes.status === 'fulfilled' && !settingsRes.value.error ? settingsRes.value : null
                setSettings(settingsData)
                setAllOrders(orders)

                // Facturación del mes actual
                const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
                const monthRevenue = orders
                    .filter((o: any) => new Date(o.createdAt) >= thisMonth)
                    .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)

                // Pedidos activos (no completados)
                const activeOrders = orders.filter((o: any) => o.status !== 'COMPLETED').length
                const pending = orders.filter((o: any) => o.status === 'PENDING').length
                setPendingOrders(pending)

                // Stock crítico
                const lowStock = inventory.filter((m: any) => {
                    const stock = m.stocks?.reduce((acc: number, s: any) => acc + s.weightGrams, 0) || 0
                    return stock < 200
                })

                const completedRevenue = orders
                    .filter((o: any) => o.status === 'COMPLETED')
                    .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)
                const totalRevenue = orders
                    .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)

                setStats({ orders: 0, printers: printers.length, lowStock: lowStock.length, completedRevenue, totalRevenue, monthRevenue, activeOrders })
                setLowStockItems(lowStock.slice(0, 3))
                setRecentActivity(orders.slice(0, 5))
                setIsEmpty({
                    orders: orders.length === 0,
                    printers: printers.length === 0,
                    inventory: inventory.length === 0,
                })
            } catch (e) {
                console.error('Dashboard load error:', e)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const fmt = (n: number) => {
        const curr = settings?.currency || 'ARS'
        const symbol = curr === 'USD' ? 'US$' : '$'
        return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    }

    const greeting = getGreeting()
    const aiBriefing = useMemo(() =>
        buildAIBriefing(lowStockItems, pendingOrders, stats.monthRevenue, allOrders.length),
        [lowStockItems, pendingOrders, stats.monthRevenue, allOrders.length]
    )

    // Stat cards — empty state aware
    const statCards = [
        {
            label: 'FACTURACIÓN MES',
            value: isLoading ? '—' : stats.monthRevenue > 0 ? fmt(stats.monthRevenue) : null,
            empty: 'Sin pedidos este mes',
            sub: 'pedidos del mes',
            icon: TrendingUp,
            color: 'text-brand-cyan'
        },
        {
            label: 'PEDIDOS ACTIVOS',
            value: isLoading ? '—' : stats.activeOrders > 0 ? String(stats.activeOrders) : null,
            empty: 'Sin pedidos activos',
            sub: 'en producción',
            icon: ShoppingCart,
            color: 'text-brand-orange'
        },
        {
            label: 'IMPRESORAS',
            value: isLoading ? '—' : stats.printers > 0 ? String(stats.printers) : null,
            empty: 'Sin impresoras',
            sub: 'registradas',
            icon: Activity,
            color: 'text-green-500'
        },
        {
            label: 'STOCK CRÍTICO',
            value: isLoading ? '—' : stats.lowStock > 0 ? String(stats.lowStock) : null,
            empty: '✅ Stock OK',
            sub: stats.lowStock === 1 ? 'material bajo mínimo' : 'materiales bajo mínimo',
            icon: Zap,
            color: stats.lowStock > 0 ? 'text-red-500' : 'text-green-500'
        },
    ]

    return (
        <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto">

            {/* Header + greeting */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-orange text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></div>
                        Sistema Operativo JR3D v2.5
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white">
                        {greeting}{userName ? (
                            <>, <span className="text-brand-orange">{userName}</span></>
                        ) : ''}
                    </h1>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Tooltip content="Buscar en la actividad reciente por cliente o proyecto">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-56 bg-black/40 border border-neutral-800 rounded-xl px-4 py-2 pl-10 text-xs focus:outline-none focus:border-brand-orange/50 transition-all"
                        />
                    </Tooltip>
                    <Search className="absolute left-3 top-2.5 text-neutral-600" size={14} />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {statCards.map((stat, i) => (
                    <Tooltip key={i} content={`${stat.label}: ${stat.sub}`}>
                        <div className="bg-neutral-950/40 border border-neutral-900 p-5 sm:p-6 rounded-3xl hover:border-neutral-700 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <stat.icon size={56} className={stat.color} />
                            </div>
                            <div className="text-[9px] font-black tracking-widest mb-1 uppercase text-neutral-500">{stat.label}</div>
                            {isLoading ? (
                                <div className="text-3xl sm:text-4xl font-black mb-1 text-neutral-700 animate-pulse">—</div>
                            ) : stat.value !== null ? (
                                <div className="text-3xl sm:text-4xl font-black mb-1 text-white">{stat.value}</div>
                            ) : (
                                <div className="text-sm font-bold text-neutral-600 mt-2 mb-2 leading-tight">{stat.empty}</div>
                            )}
                            {stat.value !== null && !isLoading && (
                                <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-tighter">{stat.sub}</div>
                            )}
                        </div>
                    </Tooltip>
                ))}
            </div>

            {/* Onboarding */}
            {!isLoading && isEmpty && !onboardingDismissed && (isEmpty.orders || isEmpty.printers || isEmpty.inventory) && (
                <OnboardingCard
                    isEmpty={isEmpty}
                    onDismiss={() => {
                        setOnboardingDismissed(true)
                        localStorage.setItem('ph_onboarding_dismissed', 'true')
                    }}
                />
            )}

            {/* Main grid: activity + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Actividad Reciente */}
                <div className="lg:col-span-2">
                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-4 sm:p-6 lg:p-8">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h2 className="text-base sm:text-xl font-bold flex items-center gap-3">
                                <Activity className="text-brand-orange" size={20} />
                                Actividad Reciente
                            </h2>
                            <Tooltip content="Ver listado completo de pedidos">
                                <Link href="/dashboard/orders" className="text-neutral-500 text-xs hover:text-white transition-colors flex items-center gap-1 font-bold">
                                    VER TODO <ChevronRight size={14} />
                                </Link>
                            </Tooltip>
                        </div>
                        <div className="space-y-3">
                            {isLoading ? (
                                <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest p-10 text-center animate-pulse">Cargando datos...</p>
                            ) : recentActivity.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Package size={36} className="text-neutral-800" />
                                    <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest text-center">
                                        Sin pedidos aún — ¡cargá el primero!
                                    </p>
                                    <Link href="/dashboard/orders" className="mt-1 px-4 py-2 bg-brand-orange text-black text-[10px] font-black rounded-xl hover:scale-105 transition-all">
                                        CREAR PEDIDO
                                    </Link>
                                </div>
                            ) : (
                                recentActivity
                                    .filter((order: any) => {
                                        if (!searchQuery) return true
                                        const q = searchQuery.toLowerCase()
                                        return (
                                            order.customerName?.toLowerCase().includes(q) ||
                                            order.items?.[0]?.projectName?.toLowerCase().includes(q)
                                        )
                                    })
                                    .map((order: any) => (
                                        <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-10 rounded-full bg-neutral-800 overflow-hidden">
                                                    <div className={cn('w-full h-full', order.status === 'COMPLETED' ? 'bg-green-500' : 'bg-brand-orange')}></div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white group-hover:text-brand-orange transition-colors">
                                                        {order.customerName}: {order.items?.[0]?.projectName || 'Pedido'}
                                                    </div>
                                                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase">
                                                        {new Date(order.createdAt).toLocaleDateString()} · {fmt(Number(order.totalPrice))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={cn('px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase hidden sm:block',
                                                order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-brand-orange/10 text-brand-orange')}>
                                                {order.status === 'COMPLETED' ? 'COMPLETADO' :
                                                 order.status === 'PRINTING' ? 'EN IMPRENTA' :
                                                 order.status === 'SHIPPED' ? 'ENVIADO' :
                                                 order.status === 'PENDING' ? 'PENDIENTE' : order.status}
                                            </div>
                                        </Link>
                                    ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* IA Briefing */}
                    <div className="bg-gradient-to-br from-brand-orange/20 to-brand-cyan/10 border border-brand-orange/20 rounded-3xl p-6 sm:p-8 hover:border-brand-orange/50 transition-all">
                        <div className="flex items-center gap-2 text-brand-orange mb-4">
                            <BrainCircuit size={20} className="animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest">IA BRIEFING</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed mb-4 text-neutral-200">
                            {isLoading ? (
                                <span className="text-neutral-600 animate-pulse">Analizando tu taller...</span>
                            ) : (
                                <span>"{aiBriefing}"</span>
                            )}
                        </p>
                        <Tooltip content="Laboratorio de inteligencia artificial multi-proveedor">
                            <Link href="/dashboard/ai-lab" className="block w-full py-3 bg-black/40 hover:bg-black/60 rounded-xl text-xs font-bold border border-white/5 transition-all text-neutral-300 text-center">
                                ABRIR LAB IA
                            </Link>
                        </Tooltip>
                    </div>

                    {/* Stock Crítico */}
                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4 text-white">
                            <AlertTriangle className={stats.lowStock > 0 ? 'text-red-500' : 'text-green-500'} size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">STOCK CRÍTICO</h3>
                        </div>
                        {isLoading ? (
                            <p className="text-xs text-neutral-600 animate-pulse">Verificando stock...</p>
                        ) : lowStockItems.length > 0 ? (
                            <div className="space-y-2">
                                {lowStockItems.map((m: any) => {
                                    const stock = m.stocks?.reduce((acc: number, s: any) => acc + s.weightGrams, 0) || 0
                                    return (
                                        <Link key={m.id} href="/dashboard/inventory" className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase truncate max-w-[100px]">{m.name}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-red-500">{stock.toFixed(0)}g</span>
                                        </Link>
                                    )
                                })}
                                {stats.lowStock > 3 && (
                                    <Link href="/dashboard/inventory" className="text-[9px] font-bold text-neutral-500 hover:text-brand-orange transition-colors block text-center pt-1">
                                        +{stats.lowStock - 3} más → IR AL INVENTARIO
                                    </Link>
                                )}
                            </div>
                        ) : isEmpty?.inventory ? (
                            <div className="flex items-center gap-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                                <Package size={16} className="text-neutral-500" />
                                <span className="text-[10px] font-black text-neutral-500 uppercase">Sin materiales cargados</span>
                            </div>
                        ) : (
                            <Link href="/dashboard/inventory" className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl hover:bg-green-500/10 transition-all">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-[10px] font-black text-green-500/80 uppercase">Todo el stock OK</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Billing Chart */}
            {!isLoading && (
                <BillingChart orders={allOrders} fmt={fmt} />
            )}

            {/* Printers Monitor */}
            <PrintersMonitor />
        </div>
    )
}

/* ─── Printers Monitor ─── */
function PrintersMonitor() {
    const [statuses, setStatuses] = useState<PrinterStatus[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPrinters = async () => {
            try {
                const res = await fetch('/api/printers')
                const printers = await res.json()
                if (printers.error) { setLoading(false); return }

                let savedIps: Record<string, { ip: string; port: number }> = {}
                try { savedIps = JSON.parse(localStorage.getItem('ph_printer_ips') || '{}') } catch {}

                const printersWithIp = printers.map((p: any) => ({
                    ...p,
                    ip_address: p.ip_address || savedIps[p.id]?.ip || '',
                    port: p.port || savedIps[p.id]?.port || 7125,
                }))

                const results = await Promise.all(
                    printersWithIp
                        .filter((p: any) => p.ip_address)
                        .map(async (p: any) => {
                            const ip = p.ip_address
                            const port = p.port || 7125
                            const proxyUrl = `http://localhost:3001/proxy/${ip}/${port}`
                            const directUrl = `http://${ip}:${port}`

                            const tryFetch = async (baseUrl: string) => {
                                const controller = new AbortController()
                                const timeout = setTimeout(() => controller.abort(), 3000)
                                try {
                                    const [printerRes, statusRes] = await Promise.all([
                                        fetch(`${baseUrl}/api/printer`, { signal: controller.signal }),
                                        fetch(`${baseUrl}/api/printer/objects/query?extruder&heater_bed&print_stats&virtual_sdcard`, { signal: controller.signal }),
                                    ])
                                    clearTimeout(timeout)
                                    if (printerRes.ok && statusRes.ok) {
                                        return { printer: await printerRes.json(), status: await statusRes.json() }
                                    }
                                } catch { clearTimeout(timeout) }
                                return null
                            }

                            try {
                                let result = await tryFetch(proxyUrl)
                                if (!result) result = await tryFetch(directUrl)
                                if (!result) throw new Error('offline')

                                const extruder = result.status.result?.status?.extruder
                                const heaterBed = result.status.result?.status?.heater_bed
                                const printStats = result.status.result?.status?.print_stats
                                const virtualSd = result.status.result?.status?.virtual_sdcard

                                return {
                                    id: p.id, name: p.name, ip_address: ip, port,
                                    online: true,
                                    temperature: { nozzle: extruder?.temperature || 0, bed: heaterBed?.temperature || 0 },
                                    print: {
                                        state: printStats?.state || 'standby',
                                        filename: printStats?.filename || '',
                                        progress: virtualSd?.progress || 0,
                                    },
                                }
                            } catch {
                                return { id: p.id, name: p.name, ip_address: ip, port, online: false }
                            }
                        })
                )
                setStatuses(results as PrinterStatus[])
            } catch (e) {
                console.error('Error al consultar impresoras:', e)
            } finally {
                setLoading(false)
            }
        }

        fetchPrinters()
        const interval = setInterval(fetchPrinters, 15000)
        return () => clearInterval(interval)
    }, [])

    if (loading && statuses.length === 0) return null
    if (statuses.length === 0) return null

    const printStateLabel = (s?: string) => {
        if (!s || s === 'standby') return 'En espera'
        if (s === 'printing') return 'Imprimiendo'
        if (s === 'complete') return 'Completado'
        if (s === 'error') return 'Error'
        if (s === 'paused') return 'Pausado'
        return s
    }

    return (
        <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
                <Printer className="text-brand-orange" size={18} />
                <h2 className="text-base sm:text-xl font-bold text-white">Monitor de Impresoras</h2>
                <span className="text-[9px] text-neutral-600 font-bold font-mono">· 15s auto-refresh</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {statuses.map((p) => (
                    <div key={p.id} className="bg-neutral-950/40 border border-neutral-900 rounded-2xl p-5 backdrop-blur-md hover:border-neutral-700 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-2 h-2 rounded-full ${p.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500/50'}`}></div>
                                <span className="font-bold text-sm text-white">{p.name}</span>
                            </div>
                            {p.online ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-500/50" />}
                        </div>

                        {p.online && p.temperature ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 rounded-xl p-3 text-center">
                                        <div className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Hotend</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <Thermometer size={12} className="text-brand-orange" />
                                            <span className="text-lg font-black text-white">{p.temperature.nozzle.toFixed(0)}°</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 rounded-xl p-3 text-center">
                                        <div className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Cama</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <Thermometer size={12} className="text-brand-cyan" />
                                            <span className="text-lg font-black text-white">{p.temperature.bed.toFixed(0)}°</span>
                                        </div>
                                    </div>
                                </div>

                                {p.print && p.print.state === 'printing' && (
                                    <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3 space-y-2">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="font-bold text-neutral-400 uppercase tracking-wider">{printStateLabel(p.print.state)}</span>
                                            <span className="font-mono font-bold text-brand-orange">{(p.print.progress * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-brand-orange to-orange-400 rounded-full" style={{ width: `${p.print.progress * 100}%` }}></div>
                                        </div>
                                        <p className="text-[9px] text-neutral-600 font-mono truncate">{p.print.filename || 'Archivo desconocido'}</p>
                                    </div>
                                )}

                                {p.print && p.print.state !== 'printing' && (
                                    <div className="text-center py-2">
                                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                            {printStateLabel(p.print.state)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                                    {p.online ? 'Conectando...' : 'Impresora offline'}
                                </span>
                                {p.ip_address && (
                                    <p className="text-[9px] text-neutral-700 font-mono mt-1">{p.ip_address}:{p.port}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─── Onboarding Card ─── */
interface OnboardingCardProps {
    isEmpty: { orders: boolean; printers: boolean; inventory: boolean }
    onDismiss: () => void
}

function OnboardingCard({ isEmpty, onDismiss }: OnboardingCardProps) {
    const steps = [
        {
            key: 'printers' as const,
            title: 'Agregá tu primera impresora',
            desc: 'Configurá la IP de tu impresora 3D para monitoreo en tiempo real.',
            href: '/dashboard/settings',
            done: !isEmpty.printers,
        },
        {
            key: 'inventory' as const,
            title: 'Cargá materiales al inventario',
            desc: 'Registrá tus filamentos para controlar el stock disponible.',
            href: '/dashboard/inventory',
            done: !isEmpty.inventory,
        },
        {
            key: 'orders' as const,
            title: 'Creá tu primer pedido',
            desc: 'Registrá una orden de producción y comenzá a trackear tus ventas.',
            href: '/dashboard/orders',
            done: !isEmpty.orders,
        },
    ]

    return (
        <div className="bg-gradient-to-br from-brand-orange/10 to-brand-cyan/5 border border-brand-orange/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="absolute top-0 right-0 p-4 text-brand-orange/10">
                <Settings size={80} />
            </div>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                        🚀 ¡Bienvenido a <span className="text-brand-orange">PrintHype</span>!
                    </h2>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                        Seguí estos pasos para poner en marcha tu taller digital.
                    </p>
                </div>
                <button
                    onClick={onDismiss}
                    aria-label="Cerrar onboarding"
                    className="p-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {steps.map((step, i) => (
                    <div
                        key={step.key}
                        className={`relative p-5 rounded-2xl border transition-all ${
                            step.done
                                ? 'bg-green-500/5 border-green-500/20'
                                : 'bg-black/40 border-neutral-800 hover:border-brand-orange/50'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                                step.done
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-brand-orange/20 text-brand-orange'
                            }`}>
                                {step.done ? <CheckCircle2 size={20} /> : <span>{i + 1}</span>}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                                step.done ? 'text-green-500' : 'text-neutral-600'
                            }`}>
                                {step.done ? 'COMPLETADO' : `PASO ${i + 1}`}
                            </span>
                        </div>

                        <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                        <p className="text-[10px] text-neutral-500 mb-4 leading-relaxed">{step.desc}</p>

                        {!step.done && (
                            <Link
                                href={step.href}
                                className="block w-full py-2.5 bg-brand-orange text-black text-center text-[10px] font-black rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(255,102,0,0.2)]"
                            >
                                IR A {step.title.split(' ').pop()?.toUpperCase() || 'CONFIGURAR'}
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
