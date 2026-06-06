'use client'

import { useEffect, useState, useMemo } from 'react'
import {
    Zap, ShoppingCart, TrendingUp, Activity, AlertTriangle,
    BrainCircuit, ChevronRight, Search, CheckCircle2,
    Thermometer, Printer, Wifi, WifiOff, Clock, X,
    Settings, Package, BarChart3, ArrowUpRight, ArrowDownRight,
    FileText, Plus, HelpCircle, Play, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Tooltip from '@/components/ui/Tooltip'
import Modal from '@/components/ui/Modal'

interface PrinterStatus {
    id: string
    name: string
    ip_address: string
    port: number
    online: boolean
    temperature?: { nozzle: number; bed: number }
    print?: { state: string; filename: string; progress: number }
}

interface AlertItem {
    id: string
    type: 'critical' | 'warning' | 'info'
    title: string
    desc: string
    actionLabel: string
    actionHref: string
}

/* ─── Helpers ─── */
function getGreeting() {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return 'Buenos días'
    if (h >= 12 && h < 19) return 'Buenas tardes'
    return 'Buenas noches'
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
    const [allBudgets, setAllBudgets] = useState<any[]>([])
    const [allPrinters, setAllPrinters] = useState<any[]>([])
    const [inventory, setInventory] = useState<any[]>([])
    
    // KPIs
    const [stats, setStats] = useState({
        orders: 0,
        printers: 0,
        lowStock: 0,
        completedRevenue: 0,
        totalRevenue: 0,
        monthRevenue: 0,
        prevMonthRevenue: 0,
        monthProfit: 0,
        prevMonthProfit: 0,
        activeOrders: 0,
        prevActiveOrders: 0,
        pendingPrintHours: 0,
    })

    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEmpty, setIsEmpty] = useState<{ orders: boolean; printers: boolean; inventory: boolean } | null>(null)
    const [onboardingDismissed, setOnboardingDismissed] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [settings, setSettings] = useState<any>(null)
    
    // Quick Order Modal
    const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false)
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        priority: 'NORMAL',
        totalPrice: '',
        projectName: '',
        materialId: '',
        weightGrams: '',
        deliveryDate: ''
    })

    useEffect(() => {
        const dismissed = localStorage.getItem('ph_onboarding_dismissed')
        if (dismissed === 'true') setOnboardingDismissed(true)
    }, [])

    const loadData = async () => {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                const emailPrefix = user.email.split('@')[0]
                setUserName(emailPrefix === 'admin' ? null : emailPrefix)
            }

            const [ordersRes, printersRes, inventoryRes, settingsRes, budgetsRes] = await Promise.allSettled([
                fetch('/api/orders').then(r => r.json()),
                fetch('/api/printers').then(r => r.json()),
                fetch('/api/inventory').then(r => r.json()),
                fetch('/api/settings').then(r => r.json()),
                fetch('/api/budgets').then(r => r.json()),
            ])

            const orders = ordersRes.status === 'fulfilled' && !ordersRes.value.error ? ordersRes.value : []
            const printers = printersRes.status === 'fulfilled' && !printersRes.value.error ? printersRes.value : []
            const materials = inventoryRes.status === 'fulfilled' && !inventoryRes.value.error ? inventoryRes.value : []
            const settingsData = settingsRes.status === 'fulfilled' && !settingsRes.value.error ? settingsRes.value : null
            const budgets = budgetsRes.status === 'fulfilled' && !budgetsRes.value.error ? budgetsRes.value : []

            setSettings(settingsData)
            setAllOrders(orders)
            setAllBudgets(budgets)
            setAllPrinters(printers)
            setInventory(materials)

            // Fechas del mes actual y anterior
            const now = new Date()
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

            // --- Facturación del mes actual y del mes anterior ---
            const monthRevenue = orders
                .filter((o: any) => new Date(o.createdAt) >= startOfThisMonth)
                .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)

            const prevMonthRevenue = orders
                .filter((o: any) => {
                    const d = new Date(o.createdAt)
                    return d >= startOfPrevMonth && d <= endOfPrevMonth
                })
                .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)

            // --- Ganancia del mes actual y anterior ---
            // La ganancia la calculamos aplicando el porcentaje de margen de ganancia o basándonos en presupuestos aprobados
            // Si el pedido tiene un materialId y peso, podemos calcular sus costos reales basados en settings.
            const kwhPrice = settingsData?.kwhPrice || 120
            const laborHourPrice = settingsData?.laborHourPrice || 800
            
            const calcOrderProfit = (o: any) => {
                const grams = o.items?.[0]?.weightGrams || o.weightGrams || 0
                const matPrice = materials.find((m: any) => m.id === o.items?.[0]?.materialId)?.pricePerKg || 3000
                const costMaterial = (grams / 1000) * matPrice
                const costEnergy = 3.5 * kwhPrice // Estimado de 3.5 kWh por pieza promedio
                const costLabor = laborHourPrice  // Estimado de 1 hora de mano de obra
                const totalCost = costMaterial + costEnergy + costLabor
                return Math.max(0, Number(o.totalPrice || 0) - totalCost)
            }

            const monthProfit = orders
                .filter((o: any) => new Date(o.createdAt) >= startOfThisMonth)
                .reduce((acc: number, o: any) => acc + calcOrderProfit(o), 0)

            const prevMonthProfit = orders
                .filter((o: any) => {
                    const d = new Date(o.createdAt)
                    return d >= startOfPrevMonth && d <= endOfPrevMonth
                })
                .reduce((acc: number, o: any) => acc + calcOrderProfit(o), 0)

            // --- Pedidos activos ---
            const activeOrdersList = orders.filter((o: any) => o.status !== 'COMPLETED')
            const activeOrders = activeOrdersList.length
            
            // Pedidos activos del periodo anterior (estimado como pedidos del mes pasado no completados)
            const prevActiveOrders = orders.filter((o: any) => {
                const d = new Date(o.createdAt)
                return d < startOfThisMonth && o.status !== 'COMPLETED'
            }).length

            // --- Horas de impresión pendientes ---
            // Calculado a partir de los pedidos activos. Si no se especifican horas de impresión en el pedido,
            // podemos estimar 1 hora de impresión por cada 15 gramos de filamento como valor base.
            const pendingPrintHours = activeOrdersList.reduce((acc: number, o: any) => {
                const grams = o.items?.[0]?.weightGrams || 50
                // Estimación básica: 1 hora de impresión cada 20g
                return acc + (grams / 20)
            }, 0)

            // Stock crítico
            const lowStock = materials.filter((m: any) => {
                const stock = m.stocks?.reduce((acc: number, s: any) => acc + s.weightGrams, 0) || 0
                return stock < 200
            })

            const completedRevenue = orders
                .filter((o: any) => o.status === 'COMPLETED')
                .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)
            const totalRevenue = orders
                .reduce((acc: number, o: any) => acc + Number(o.totalPrice || 0), 0)

            setStats({
                orders: orders.length,
                printers: printers.length,
                lowStock: lowStock.length,
                completedRevenue,
                totalRevenue,
                monthRevenue,
                prevMonthRevenue,
                monthProfit,
                prevMonthProfit,
                activeOrders,
                prevActiveOrders,
                pendingPrintHours
            })

            // Actividad Reciente combinada (Pedidos creados, presupuestos enviados)
            const combinedActivity: any[] = []
            
            orders.slice(0, 10).forEach((o: any) => {
                combinedActivity.push({
                    id: o.id,
                    type: o.status === 'COMPLETED' ? 'order_delivered' : 'order_created',
                    title: `${o.status === 'COMPLETED' ? 'Pedido Entregado' : 'Nuevo Pedido'} · ${o.customerName}`,
                    desc: `${o.items?.[0]?.projectName || 'Pieza 3D'} — Consumido ${o.items?.[0]?.weightGrams || 0}g`,
                    time: new Date(o.createdAt),
                    meta: fmt(o.totalPrice)
                })
            })

            budgets.slice(0, 5).forEach((b: any) => {
                combinedActivity.push({
                    id: b.id,
                    type: b.status === 'APPROVED' ? 'budget_approved' : 'budget_sent',
                    title: `Presupuesto ${b.status === 'APPROVED' ? 'Aprobado' : 'Enviado'} · ${b.clientName}`,
                    desc: `${b.jobName} — ${b.printHours}hs estimadas`,
                    time: new Date(b.createdAt),
                    meta: fmt(b.salePrice)
                })
            })

            // Ordenar por fecha desc
            combinedActivity.sort((a, b) => b.time.getTime() - a.time.getTime())
            setRecentActivity(combinedActivity.slice(0, 6))

            setIsEmpty({
                orders: orders.length === 0,
                printers: printers.length === 0,
                inventory: materials.length === 0,
            })

            if (materials.length > 0) {
                setFormData(prev => ({ ...prev, materialId: materials[0].id }))
            }
        } catch (e) {
            console.error('Dashboard load error:', e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const fmt = (n: number) => {
        const curr = settings?.currency || 'ARS'
        const symbol = curr === 'USD' ? 'US$' : '$'
        return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }

    // --- Cálculos de Variaciones (KPIs) ---
    const getVariation = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%'
        const percent = ((current - previous) / previous) * 100
        return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`
    }

    // --- Alertas Inteligentes Priorizadas ---
    const alerts = useMemo((): AlertItem[] => {
        const list: AlertItem[] = []
        
        // 1. Impresoras Detenidas (Crítico)
        const offlinePrinters = allPrinters.filter(p => !p.online)
        offlinePrinters.forEach(p => {
            list.push({
                id: `printer-${p.id}`,
                type: 'critical',
                title: `Impresora Detenida: ${p.name}`,
                desc: 'Se encuentra desconectada de la red local o reporta falla de comunicación.',
                actionLabel: 'REVISAR AJUSTES',
                actionHref: '/dashboard/settings'
            })
        })

        // 2. Stock Crítico de filamentos (Crítico)
        inventory.forEach((m: any) => {
            const stock = m.stocks?.reduce((acc: number, s: any) => acc + s.weightGrams, 0) || 0
            if (stock < 200) {
                list.push({
                    id: `stock-${m.id}`,
                    type: 'critical',
                    title: `Stock Crítico: ${m.name}`,
                    desc: `Quedan solo ${stock.toFixed(0)}g disponibles de este filamento.`,
                    actionLabel: 'REPONER FILAMENTO',
                    actionHref: '/dashboard/inventory'
                })
            }
        })

        // 3. Pedidos próximos a vencer o atrasados (Advertencia)
        allOrders.forEach(o => {
            if (o.status !== 'COMPLETED' && o.deliveryDate) {
                const delivery = new Date(o.deliveryDate + 'T00:00:00')
                const today = new Date(); today.setHours(0,0,0,0)
                const isOverdue = delivery < today
                const isUrgent = delivery.getTime() === today.getTime() || (delivery.getTime() - today.getTime()) <= 86400000

                if (isOverdue) {
                    list.push({
                        id: `overdue-${o.id}`,
                        type: 'warning',
                        title: `Pedido Retrasado · ${o.customerName}`,
                        desc: `La fecha de entrega del proyecto "${o.items?.[0]?.projectName}" expiró el ${new Date(o.deliveryDate).toLocaleDateString()}.`,
                        actionLabel: 'VER PEDIDO',
                        actionHref: `/dashboard/orders/${o.id}`
                    })
                } else if (isUrgent) {
                    list.push({
                        id: `urgent-${o.id}`,
                        type: 'warning',
                        title: `Entrega Próxima · ${o.customerName}`,
                        desc: `El pedido del proyecto "${o.items?.[0]?.projectName}" vence pronto.`,
                        actionLabel: 'VER DETALLE',
                        actionHref: `/dashboard/orders/${o.id}`
                    })
                }
            }
        })

        // 4. Presupuestos sin respuesta (Informativo)
        allBudgets.forEach(b => {
            if (b.status === 'SENT') {
                const sentDate = new Date(b.createdAt)
                const ageHours = (new Date().getTime() - sentDate.getTime()) / (1000 * 60 * 60)
                if (ageHours > 48) {
                    list.push({
                        id: `budget-${b.id}`,
                        type: 'info',
                        title: `Presupuesto sin respuesta · ${b.clientName}`,
                        desc: `Enviado hace ${Math.floor(ageHours / 24)} días por un valor de ${fmt(b.salePrice)}.`,
                        actionLabel: 'RECONTACTAR',
                        actionHref: '/dashboard/budgets'
                    })
                }
            }
        })

        return list.sort((a, b) => {
            const priority = { critical: 1, warning: 2, info: 3 }
            return priority[a.type] - priority[b.type]
        })
    }, [allPrinters, inventory, allOrders, allBudgets])

    // --- Insights del Asistente PrintHype ---
    const assistantInsights = useMemo(() => {
        if (allOrders.length === 0) {
            return {
                mainText: 'Hola, soy tu Asistente de PrintHype. Para darte recomendaciones operativas reales y mejorar tu ROI, carga tu primer pedido o presupuesto.',
                insights: []
            }
        }

        const itemsCount: Record<string, number> = {}
        const materialCount: Record<string, number> = {}
        let totalGrams = 0

        allOrders.forEach(o => {
            const project = o.items?.[0]?.projectName || ''
            if (project) itemsCount[project] = (itemsCount[project] || 0) + 1

            const matId = o.items?.[0]?.materialId
            const grams = o.items?.[0]?.weightGrams || 0
            if (matId) {
                materialCount[matId] = (materialCount[matId] || 0) + grams
            }
            totalGrams += grams
        })

        // Producto estrella
        const bestSeller = Object.entries(itemsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

        // Material más usado
        const mostUsedMatId = Object.entries(materialCount).sort((a, b) => b[1] - a[1])[0]?.[0]
        const mostUsedMat = inventory.find(m => m.id === mostUsedMatId)?.name || 'PLA Estándar'

        // Tendencias de Ventas
        const avgTicket = allOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0) / allOrders.length

        // Sugerencias inteligentes
        const insightList = [
            { title: '📦 Producto Estrella', text: `"${bestSeller}" es el modelo más demandado en tu taller.` },
            { title: '🧵 Insumo Principal', text: `Has consumido un estimado de ${(totalGrams/1000).toFixed(1)}kg de filamento, principalmente ${mostUsedMat}.` },
            { title: '📈 Oportunidad de Margen', text: `Tu ticket promedio por orden es de ${fmt(avgTicket)}. Considera ofrecer combos de post-procesado para aumentarlo.` }
        ]

        let mainRecommend = '✅ Tus impresoras operan con normalidad. Mantén el ritmo de producción y controla el stock de tus materiales estrella para evitar cuellos de botella.'
        if (stats.lowStock > 0) {
            mainRecommend = `⚠ Alerta de operación: Tienes ${stats.lowStock} materiales bajo mínimos. Te sugiero reponer stock antes de aceptar nuevos encargos de gran escala.`
        } else if (stats.pendingPrintHours > 50) {
            mainRecommend = '🔥 Carga de trabajo alta: Tienes más de 50 horas de impresión pendientes. Te sugiero optimizar la distribución de bandejas para maximizar la entrega.'
        }

        return {
            mainText: mainRecommend,
            insights: insightList
        }
    }, [allOrders, inventory, stats.lowStock, stats.pendingPrintHours])

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (!data.error) {
                setIsQuickOrderOpen(false)
                setFormData({
                    customerName: '',
                    customerPhone: '',
                    priority: 'NORMAL',
                    totalPrice: '',
                    projectName: '',
                    materialId: inventory.length > 0 ? inventory[0].id : '',
                    weightGrams: '',
                    deliveryDate: ''
                })
                loadData()
            }
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
            {/* Header + greeting */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-brand-orange text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></div>
                        Centro de Control de Operaciones
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white">
                        {getGreeting()}{userName ? (
                            <>, <span className="text-brand-orange">{userName}</span></>
                        ) : ''}
                    </h1>
                </div>
                <div className="relative w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar cliente o proyecto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 bg-black/40 border border-neutral-800 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-brand-orange/50 transition-all text-white"
                    />
                    <Search className="absolute left-3 top-3.5 text-neutral-600" size={14} />
                </div>
            </div>

            {/* SECCIÓN 1 - KPIs Principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                    {
                        label: 'FACTURACIÓN MES',
                        value: isLoading ? '—' : fmt(stats.monthRevenue),
                        variation: getVariation(stats.monthRevenue, stats.prevMonthRevenue),
                        isPositive: stats.monthRevenue >= stats.prevMonthRevenue,
                        icon: TrendingUp,
                        color: 'text-brand-orange',
                        glow: 'group-hover:border-brand-orange/40'
                    },
                    {
                        label: 'GANANCIA ESTIMADA',
                        value: isLoading ? '—' : fmt(stats.monthProfit),
                        variation: getVariation(stats.monthProfit, stats.prevMonthProfit),
                        isPositive: stats.monthProfit >= stats.prevMonthProfit,
                        icon: BarChart3,
                        color: 'text-brand-cyan',
                        glow: 'group-hover:border-brand-cyan/40'
                    },
                    {
                        label: 'PEDIDOS ACTIVOS',
                        value: isLoading ? '—' : String(stats.activeOrders),
                        variation: getVariation(stats.activeOrders, stats.prevActiveOrders),
                        isPositive: stats.activeOrders >= stats.prevActiveOrders,
                        icon: ShoppingCart,
                        color: 'text-purple-500',
                        glow: 'group-hover:border-purple-500/40'
                    },
                    {
                        label: 'HORAS PENDIENTES',
                        value: isLoading ? '—' : `${stats.pendingPrintHours.toFixed(0)}hs`,
                        variation: 'Promedio de cola',
                        isPositive: true,
                        icon: Clock,
                        color: 'text-green-500',
                        glow: 'group-hover:border-green-500/40'
                    }
                ].map((kpi, i) => (
                    <div key={i} className="bg-neutral-950/40 border border-neutral-900 p-5 rounded-3xl transition-all duration-300 hover:bg-neutral-900/10 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <kpi.icon size={48} className={kpi.color} />
                        </div>
                        <div>
                            <div className="text-[9px] font-black tracking-widest uppercase text-neutral-500 mb-1">{kpi.label}</div>
                            {isLoading ? (
                                <div className="text-2xl sm:text-3xl font-black text-neutral-700 animate-pulse">—</div>
                            ) : (
                                <div className="text-2xl sm:text-3xl font-mono font-black text-white">{kpi.value}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-4">
                            {kpi.isPositive ? (
                                <ArrowUpRight size={14} className="text-green-500 shrink-0" />
                            ) : (
                                <ArrowDownRight size={14} className="text-red-500 shrink-0" />
                            )}
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-tight",
                                kpi.isPositive ? "text-green-500" : "text-red-500"
                            )}>
                                {kpi.variation}
                            </span>
                            <span className="text-[9px] text-neutral-600 font-bold uppercase">vs. mes ant.</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main grid: Alertas + Asistente IA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                
                {/* SECCIÓN 2 - Alertas Inteligentes (2 Columnas en pantallas anchas) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-base sm:text-xl font-bold flex items-center gap-3">
                                <AlertTriangle className="text-brand-orange animate-pulse" size={20} />
                                Alertas del Negocio
                            </h2>
                            <span className="px-2.5 py-0.5 bg-neutral-900 text-neutral-500 text-[10px] font-bold rounded-full">
                                {alerts.length} PRIORITARIAS
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="space-y-3">
                                <div className="h-16 bg-neutral-900/50 rounded-2xl animate-pulse"></div>
                                <div className="h-16 bg-neutral-900/50 rounded-2xl animate-pulse"></div>
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <CheckCircle2 size={36} className="text-green-500" />
                                <div>
                                    <p className="text-sm font-bold text-white">Todo bajo control</p>
                                    <p className="text-xs text-neutral-500">No hay problemas críticos en stock, impresoras o entregas.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                                {alerts.map(alert => (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3",
                                            alert.type === 'critical' ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10' :
                                            alert.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/10 hover:bg-yellow-500/10' :
                                            'bg-brand-cyan/5 border-brand-cyan/10 hover:bg-brand-cyan/10'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse",
                                                alert.type === 'critical' ? 'bg-red-500' :
                                                alert.type === 'warning' ? 'bg-yellow-500' : 'bg-brand-cyan'
                                            )} />
                                            <div>
                                                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">{alert.title}</h4>
                                                <p className="text-[11px] text-neutral-500 mt-1 leading-snug">{alert.desc}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={alert.actionHref}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest text-center self-end sm:self-center transition-all",
                                                alert.type === 'critical' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black' :
                                                alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black' :
                                                'bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan hover:text-black'
                                            )}
                                        >
                                            {alert.actionLabel}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* SECCIÓN 3 - Asistente PrintHype */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-brand-orange/20 to-brand-cyan/5 border border-brand-orange/20 rounded-3xl p-6 sm:p-8 hover:border-brand-orange/50 transition-all flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2.5 text-brand-orange mb-4">
                                <BrainCircuit size={22} className="animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest">🤖 Asistente PrintHype</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed mb-6 text-neutral-200">
                                {isLoading ? (
                                    <span className="text-neutral-600 animate-pulse">Analizando rendimiento...</span>
                                ) : (
                                    <span>"{assistantInsights.mainText}"</span>
                                )}
                            </p>

                            <div className="space-y-3">
                                {assistantInsights.insights.map((insight, idx) => (
                                    <div key={idx} className="bg-black/40 border border-neutral-900 p-3.5 rounded-2xl">
                                        <h5 className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-1">{insight.title}</h5>
                                        <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">{insight.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Link href="/dashboard/ai-lab" className="block w-full py-3 mt-6 bg-black/40 hover:bg-black/60 rounded-xl text-xs font-bold border border-white/5 transition-all text-neutral-300 text-center uppercase tracking-widest">
                            ABRIR CONSOLA IA
                        </Link>
                    </div>
                </div>
            </div>

            {/* Grid 3: Actividad Reciente + Acciones Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                
                {/* SECCIÓN 4 - Actividad Reciente (Timeline) */}
                <div className="lg:col-span-2">
                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-4 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-base sm:text-xl font-bold flex items-center gap-3">
                                <Activity className="text-brand-orange" size={20} />
                                Actividad Reciente
                            </h2>
                            <Link href="/dashboard/orders" className="text-neutral-500 text-xs hover:text-white transition-colors flex items-center gap-1 font-bold">
                                VER PEDIDOS <ChevronRight size={14} />
                            </Link>
                        </div>

                        {isLoading ? (
                            <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest p-10 text-center animate-pulse">Cargando línea de tiempo...</p>
                        ) : recentActivity.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Package size={36} className="text-neutral-800" />
                                <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest text-center">Sin actividad en tu taller</p>
                            </div>
                        ) : (
                            <div className="relative border-l border-neutral-800 ml-4 pl-6 space-y-6">
                                {recentActivity.map((act) => (
                                    <div key={act.id} className="relative group cursor-default">
                                        {/* Icon Dot */}
                                        <span className={cn(
                                            "absolute -left-[35px] top-1 w-6 h-6 rounded-lg flex items-center justify-center text-xs border border-neutral-950",
                                            act.type.includes('approved') || act.type.includes('delivered') ? "bg-green-500/20 text-green-500" : "bg-brand-orange/20 text-brand-orange"
                                        )}>
                                            {act.type.includes('budget') ? '🧾' : '📦'}
                                        </span>
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-brand-orange transition-all">{act.title}</h4>
                                                <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{act.desc}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono font-black text-white">{act.meta}</div>
                                                <span className="text-[9px] text-neutral-600 font-bold block mt-1 uppercase">
                                                    {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* SECCIÓN 5 - Acciones Rápidas */}
                <div className="space-y-6">
                    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 sm:p-8 flex flex-col justify-between h-full">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-6">Acciones Rápidas</h3>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => setIsQuickOrderOpen(true)}
                                    className="flex items-center gap-3 p-4 bg-brand-orange hover:bg-orange-500 text-black rounded-2xl text-xs font-black transition-all hover:scale-[1.02] shadow-lg shadow-brand-orange/15 w-full justify-start"
                                >
                                    <Plus size={16} /> NUEVO PEDIDO
                                </button>
                                
                                <Link
                                    href="/dashboard/budgets"
                                    className="flex items-center gap-3 p-4 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] w-full justify-start"
                                >
                                    <FileText size={16} className="text-brand-cyan" /> NUEVO PRESUPUESTO
                                </Link>

                                <Link
                                    href="/dashboard/inventory"
                                    className="flex items-center gap-3 p-4 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] w-full justify-start"
                                >
                                    <Package size={16} className="text-purple-500" /> AGREGAR MATERIAL
                                </Link>

                                <Link
                                    href="/dashboard/projects"
                                    className="flex items-center gap-3 p-4 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] w-full justify-start"
                                >
                                    <Activity size={16} className="text-green-500" /> REGISTRAR PRODUCCIÓN
                                </Link>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <HelpCircle size={16} className="text-neutral-500" />
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">¿Necesitas ayuda?</span>
                            </div>
                            <Link href="/dashboard/ai-lab" className="text-[9px] font-black text-brand-orange uppercase hover:underline">
                                Preguntar IA
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monitor de Impresoras */}
            <PrintersMonitor />

            {/* Modal de Pedido Rápido */}
            <Modal
                isOpen={isQuickOrderOpen}
                onClose={() => setIsQuickOrderOpen(false)}
                title="Nueva Orden de Producción"
            >
                <form className="space-y-4" onSubmit={handleCreateOrder}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Cliente *</label>
                            <input
                                type="text" required
                                value={formData.customerName}
                                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                                placeholder="Migue Baena"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-orange outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">WhatsApp</label>
                            <input
                                type="text"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                                placeholder="+54 9 11..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-orange outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Proyecto *</label>
                            <input
                                type="text" required
                                value={formData.projectName}
                                onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                                placeholder="Figura coleccionable"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-orange outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Presupuesto *</label>
                            <input
                                type="number" required
                                value={formData.totalPrice}
                                onChange={(e) => setFormData({...formData, totalPrice: e.target.value})}
                                placeholder="ARS 4500"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-orange outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Material *</label>
                            <select
                                value={formData.materialId}
                                onChange={(e) => setFormData({...formData, materialId: e.target.value})}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none"
                            >
                                {inventory.map(mat => (
                                    <option key={mat.id} value={mat.id}>{mat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Peso (gramos) *</label>
                            <input
                                type="number" required
                                value={formData.weightGrams}
                                onChange={(e) => setFormData({...formData, weightGrams: e.target.value})}
                                placeholder="50"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-orange outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase">Fecha de Entrega</label>
                        <input
                            type="date"
                            value={formData.deliveryDate}
                            onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-orange outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg hover:scale-[1.01] transition-all"
                    >
                        CREAR PEDIDO
                    </button>
                </form>
            </Modal>
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
