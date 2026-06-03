'use client'

import { useEffect, useState } from 'react'
import {
    Zap, ShoppingCart, TrendingUp, Activity, AlertTriangle,
    BrainCircuit, ChevronRight, Search, CheckCircle2,
    Thermometer, Printer, Wifi, WifiOff, Clock, X,
    Settings, Package
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

export default function DashboardPage() {
    const [userName, setUserName] = useState('admin')
    const [stats, setStats] = useState({ orders: 0, printers: 0, lowStock: 0 })
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEmpty, setIsEmpty] = useState<{ orders: boolean; printers: boolean; inventory: boolean } | null>(null)
    const [onboardingDismissed, setOnboardingDismissed] = useState(false)

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
                    setUserName(user.email.split('@')[0])
                }

                const [ordersRes, printersRes, inventoryRes] = await Promise.allSettled([
                    fetch('/api/orders').then(r => r.json()),
                    fetch('/api/printers').then(r => r.json()),
                    fetch('/api/inventory').then(r => r.json()),
                ])

                const orders = ordersRes.status === 'fulfilled' && !ordersRes.value.error ? ordersRes.value : []
                const printers = printersRes.status === 'fulfilled' && !printersRes.value.error ? printersRes.value : []
                const inventory = inventoryRes.status === 'fulfilled' && !inventoryRes.value.error ? inventoryRes.value : []

                const today = new Date(); today.setHours(0,0,0,0)
                const ordersToday = orders.filter((o: any) => new Date(o.createdAt) >= today).length

                setStats({ orders: ordersToday, printers: printers.length, lowStock: 0 })
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

    const statCards = [
        { label: 'PEDIDOS HOY', value: String(stats.orders), sub: 'recibidos', icon: ShoppingCart, color: 'text-brand-cyan' },
        { label: 'RETORNO (ROI)', value: '2.8x', sub: 'Promedio taller', icon: TrendingUp, color: 'text-green-500' },
        { label: 'IMPRESORAS', value: String(stats.printers), sub: 'registradas', icon: Activity, color: 'text-brand-orange' },
        { label: 'STOCK CRÍTICO', value: String(stats.lowStock), sub: 'bajo mínimo', icon: Zap, color: 'text-yellow-500' },
    ]

    return (
        <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-orange text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></div>
                        Sistema Operativo JR3D v2.5
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white">
                        Buenos días, <span className="text-brand-orange">{userName}</span>
                    </h1>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Tooltip content="Buscar pedidos, clientes o proyectos">
                        <input type="text" placeholder="Buscar..." className="w-full sm:w-56 bg-black/40 border border-neutral-800 rounded-xl px-4 py-2 pl-10 text-xs focus:outline-none focus:border-brand-orange/50 transition-all" />
                    </Tooltip>
                    <Search className="absolute left-3 top-2.5 text-neutral-600" size={14} />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {statCards.map((stat, i) => (
                    <Tooltip key={i} content={`${stat.label}: ${stat.sub}`}>
                    <div className="bg-neutral-950/40 border border-neutral-900 p-5 sm:p-6 rounded-3xl hover:border-neutral-700 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <stat.icon size={56} className={stat.color} />
                        </div>
                        <div className="text-[9px] font-black tracking-widest mb-1 uppercase text-neutral-500">{stat.label}</div>
                        <div className="text-3xl sm:text-4xl font-black mb-1 text-white">
                            {isLoading ? <span className="text-neutral-700 animate-pulse">—</span> : stat.value}
                        </div>
                        <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-tighter">{stat.sub}</div>
                    </div>
                    </Tooltip>
                ))}
            </div>

            {/* Onboarding — solo cuando hay áreas vacías y no se ha dismissado */}
            {!isLoading && isEmpty && !onboardingDismissed && (isEmpty.orders || isEmpty.printers || isEmpty.inventory) && (
                <OnboardingCard
                    isEmpty={isEmpty}
                    onDismiss={() => {
                        setOnboardingDismissed(true)
                        localStorage.setItem('ph_onboarding_dismissed', 'true')
                    }}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
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
                            ) : recentActivity.length === 0 && !isEmpty?.orders ? (
                                <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest p-10 text-center">No hay pedidos aún. ¡Cargá el primero!</p>
                            ) : recentActivity.length === 0 ? null : (
                                recentActivity.map((order: any) => (
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
                                ))
                            )}
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
                        <Tooltip content="Laboratorio de inteligencia artificial multi-proveedor">
                            <Link href="/dashboard/ai-lab" className="block w-full py-3 bg-black/40 hover:bg-black/60 rounded-xl text-xs font-bold border border-white/5 transition-all text-neutral-300 text-center">
                                ABRIR LAB IA
                            </Link>
                        </Tooltip>
                    </div>

                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-6 text-white">
                            <AlertTriangle className="text-yellow-500" size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">STOCK CRÍTICO</h3>
                        </div>
                        <Tooltip content="Ir a la sección de inventario">
                            <Link href="/dashboard/inventory" className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl hover:bg-green-500/10 transition-all">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-[10px] font-black text-green-500/80 uppercase">Revisá en Inventario</span>
                            </Link>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Printers Monitor */}
            <PrintersMonitor />
        </div>
    )
}

function PrintersMonitor() {
    const [statuses, setStatuses] = useState<PrinterStatus[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPrinters = async () => {
            try {
                const res = await fetch('/api/printers')
                const printers = await res.json()
                if (printers.error) { setLoading(false); return }

                // Merge with IPs stored in localStorage (browser-side config)
                let savedIps: Record<string, { ip: string; port: number }> = {}
                try {
                    savedIps = JSON.parse(localStorage.getItem('ph_printer_ips') || '{}')
                } catch {}

                const printersWithIp = printers.map((p: any) => ({
                    ...p,
                    ip_address: p.ip_address || savedIps[p.id]?.ip || '',
                    port: p.port || savedIps[p.id]?.port || 7125,
                }))

                // Query each printer directly from browser (same local network)
                const results = await Promise.all(
                    printersWithIp
                        .filter((p: any) => p.ip_address)
                        .map(async (p: any) => {
                            // Try the local proxy first, fall back to direct connection
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
                            {p.online ? (
                                <Wifi size={14} className="text-green-500" />
                            ) : (
                                <WifiOff size={14} className="text-red-500/50" />
                            )}
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
