'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Layers,
    Plus,
    MoreHorizontal,
    Filter,
    Download,
    Scale,
    Tag,
    DollarSign,
    Loader2,
    Trash2,
    Edit3,
    ChevronDown,
    ChevronRight,
    Package,
    AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { Dictionary } from '@/config/dictionary'
import Tooltip from '@/components/ui/Tooltip'

interface Material {
    id: string
    name: string
    brand: string
    type: string
    color: string
    pricePerKg: number
    initialWeight: number
    stocks: Array<{ weightGrams: number; isActive: boolean }>
}

const typeIcons: Record<string, string> = {
    PLA: '🧵',
    PETG: '🧴',
    TPU: '🫧',
    'Resina UV': '💧',
    'ABS / ASA': '🔩',
}

export default function InventoryPage() {
    const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [materials, setMaterials] = useState<Material[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [activeFilter, setActiveFilter] = useState('Todos')
    const [expandedType, setExpandedType] = useState<string | null>(null)
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [settings, setSettings] = useState<any>(null)

    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        type: 'PLA',
        initialWeight: '1000',
        pricePerKg: '',
        color: '#FF6600'
    })

    const [editForm, setEditForm] = useState({
        name: '',
        brand: '',
        type: '',
        stock_units: 0,
        pricePerKg: 0,
        color: '#FF6600'
    })

    const fetchInventory = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/inventory')
            const data = await res.json()
            if (!data.error) setMaterials(data)
        } catch (err) {
            console.error('Error fetching inventory:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings')
            const data = await res.json()
            if (!data.error) setSettings(data)
        } catch (err) {
            console.error('Error fetching settings:', err)
        }
    }

    useEffect(() => {
        fetchInventory()
        fetchSettings()
    }, [])

    const fmt = (n: number) => {
        const curr = settings?.currency || 'ARS'
        const symbol = curr === 'USD' ? 'US$' : '$'
        return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    }

    // Group materials by type
    const grouped = useMemo(() => {
        const groups: Record<string, Material[]> = {}
        const seenTypes = new Set<string>()

        // Maintain order: all defined categories first, then others
        const categories = Dictionary.inventory.categories
        for (const cat of categories) {
            groups[cat] = []
            seenTypes.add(cat)
        }

        for (const m of materials) {
            if (!groups[m.type]) groups[m.type] = []
            groups[m.type].push(m)
            seenTypes.add(m.type)
        }

        // Filter out empty groups
        const result: Record<string, Material[]> = {}
        for (const cat of categories) {
            if (groups[cat] && groups[cat].length > 0) result[cat] = groups[cat]
        }
        // Add any extra types not in categories
        for (const [type, items] of Object.entries(groups)) {
            if (!categories.includes(type) && items.length > 0) {
                result[type] = items
            }
        }

        return result
    }, [materials])

    // Filtered groups based on active filter
    const filteredGroups = useMemo(() => {
        if (activeFilter === 'Todos') return grouped
        const key = Object.keys(grouped).find(k => k === activeFilter)
        return key ? { [key]: grouped[key] } : {}
    }, [grouped, activeFilter])

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const userWebhook = localStorage.getItem('ph_user_webhook') || ''
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(userWebhook ? { 'x-webhook-url': userWebhook } : {}) },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (!data.error) {
                setIsAddMaterialModalOpen(false)
                setFormData({
                    name: '',
                    brand: '',
                    type: 'PLA',
                    initialWeight: '1000',
                    pricePerKg: '',
                    color: '#FF6600'
                })
                fetchInventory()
                // Auto-expand the type we just added
                setExpandedType(formData.type)
            } else {
                console.error('Error al agregar material:', data.error)
            }
        } catch (err) {
            console.error('Error adding material:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const openEdit = (item: Material) => {
        setEditingMaterial(item)
        setEditForm({
            name: item.name,
            brand: item.brand,
            type: item.type,
            stock_units: getMaterialStock(item),
            pricePerKg: item.pricePerKg,
            color: item.color,
        })
        setIsEditModalOpen(true)
        setConfirmDelete(null)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingMaterial) return
        setIsSaving(true)
        try {
            const res = await fetch(`/api/inventory/${editingMaterial.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })
            const data = await res.json()
            if (!data.error) {
                setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? data : m))
                setIsEditModalOpen(false)
                setEditingMaterial(null)
            } else {
                console.error('Error al actualizar material:', data.error)
            }
        } catch (err) {
            console.error('Error updating material:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!data.error) {
                setMaterials(prev => prev.filter(m => m.id !== id))
                setConfirmDelete(null)
                setIsEditModalOpen(false)
                setEditingMaterial(null)
            }
        } catch (err) {
            console.error('Error deleting material:', err)
        }
    }

    const toggleType = (type: string) => {
        setExpandedType(prev => prev === type ? null : type)
    }

    const handleFilterClick = (filter: string) => {
        setActiveFilter(filter)
        if (filter !== 'Todos' && grouped[filter]) {
            setExpandedType(filter)
        }
    }

    // Calculations
    const getMaterialStock = (material: Material) => {
        return material.stocks?.reduce((acc: number, s: any) => acc + s.weightGrams, 0) || 0
    }

    const totalInventoryValue = materials.reduce((acc, m) => {
        const stockKg = getMaterialStock(m) / 1000
        return acc + (stockKg * m.pricePerKg)
    }, 0)

    const lowStockMaterials = materials.filter(m => {
        const stock = getMaterialStock(m)
        // Umbral dinámico: 10% del peso inicial, con mínimo de 100g
        const initialW = m.initialWeight || 1000
        const threshold = Math.max(initialW * 0.10, 100)
        return stock < threshold
    })
    const lowStockAlerts = lowStockMaterials.length

    return (
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">{Dictionary.inventory.title}</h1>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1">{Dictionary.inventory.subtitle}</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Tooltip content="Exportar inventario">
                        <button className="flex items-center gap-2 px-4 py-2 border border-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-900 transition-all text-neutral-400 tap-target flex-1 sm:flex-initial justify-center">
                            <Download size={14} /> EXPORTAR
                        </button>
                    </Tooltip>
                    <Tooltip content="Agregar nuevo material al stock">
                        <button
                            onClick={() => setIsAddMaterialModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,102,0,0.3)] tap-target flex-1 sm:flex-initial justify-center"
                        >
                            <Plus size={16} /> {Dictionary.inventory.addBtn}
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* IA: Alertas de stock bajo / inactividad */}
            {lowStockAlerts > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl animate-in fade-in duration-300">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">
                                ⚠ {lowStockAlerts} material{lowStockAlerts !== 1 ? 'es' : ''} sin rotación
                            </p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                                Los siguientes materiales tienen stock bajo y podrían frenar la producción:
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {lowStockMaterials.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => { setActiveFilter(m.type); setExpandedType(m.type) }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-[10px] font-bold text-yellow-300 transition-all"
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }}/>
                                        {m.name} — {getMaterialStock(m).toFixed(0)}g
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Bar — now clickable to open groups */}
            <div className="flex bg-neutral-950/40 border border-neutral-900 p-1.5 sm:p-2 rounded-2xl backdrop-blur-md overflow-x-auto">
                <div className="flex gap-1">
                    {['Todos', ...Dictionary.inventory.categories].map((filter, i) => {
                        const count = filter === 'Todos' ? materials.length : (grouped[filter]?.length || 0)
                        return (
                            <Tooltip key={i} content={i === 0 ? 'Mostrar todos los materiales' : `Ver ${filter} (${count} materiales)`}>
                                <button
                                    onClick={() => handleFilterClick(filter)}
                                    className={cn(
                                        "px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap tap-target flex items-center gap-1.5",
                                        activeFilter === filter ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                                    )}
                                >
                                    {typeIcons[filter] || ''} {filter}
                                    {count > 0 && (
                                        <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-full font-black",
                                            activeFilter === filter ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-800 text-neutral-500'
                                        )}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            </Tooltip>
                        )
                    })}
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-4 px-4 border-l border-neutral-800">
                    <Tooltip content="Próximamente: filtros por marca, precio y rango de stock">
                        <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold">
                            <Filter size={14} /> Filtros Avanzados
                        </div>
                    </Tooltip>
                </div>
            </div>

            {/* Grouped Inventory — Accordion */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 size={24} className="animate-spin text-brand-orange" />
                    <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Analizando Stocks...</p>
                </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
                <div className="text-center py-20 bg-neutral-950/40 border border-neutral-900 rounded-3xl backdrop-blur-md">
                    <Package size={40} className="mx-auto text-neutral-800 mb-4" />
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                        {activeFilter === 'Todos'
                            ? 'No hay materiales registrados. Comienza agregando uno.'
                            : `No hay materiales de tipo ${activeFilter}.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {Object.entries(filteredGroups).map(([type, items]) => {
                        const isExpanded = expandedType === type
                        const totalStock = items.reduce((acc, m) => acc + getMaterialStock(m), 0)
                        const hasLowStock = items.some(m => getMaterialStock(m) < 200)

                        return (
                            <div key={type} className="bg-neutral-950/40 border border-neutral-900 rounded-3xl overflow-hidden backdrop-blur-md transition-all">
                                {/* Group Header — clickable */}
                                <button
                                    onClick={() => toggleType(type)}
                                    className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-white/[0.02] transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xl shrink-0">
                                            {typeIcons[type] || '📦'}
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-base sm:text-lg font-black text-white">{type}</h3>
                                                <span className="px-2 py-0.5 bg-neutral-800 rounded-lg text-[9px] font-black text-neutral-400">
                                                    {items.length} {items.length === 1 ? 'material' : 'materiales'}
                                                </span>
                                                {hasLowStock && (
                                                    <span className="px-2 py-0.5 bg-brand-orange/10 border border-brand-orange/20 rounded-lg text-[9px] font-black text-brand-orange">
                                                        ⚠ REPONER
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 font-medium">
                                                Stock total: {totalStock.toFixed(0)}g · Desde {fmt(Math.min(...items.map(m => m.pricePerKg)))}/kg
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "transition-transform duration-200 text-neutral-500",
                                            isExpanded && "rotate-180"
                                        )}>
                                            <ChevronDown size={20} />
                                        </span>
                                    </div>
                                </button>

                                {/* Expanded Items */}
                                {isExpanded && (
                                    <div className="border-t border-neutral-900 divide-y divide-neutral-900/50 animate-in slide-in-from-top-1 duration-200">
                                        {items.map((item) => {
                                            const currentStock = getMaterialStock(item)
                                            const isLow = currentStock < 200
                                            return (
                                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 pl-6 sm:pl-16 hover:bg-white/[0.02] transition-all gap-3">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        {/* Color dot */}
                                                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                                                             style={{ backgroundColor: item.color }}>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-white truncate">{item.name}</span>
                                                                <span className="text-[9px] text-neutral-600 font-mono font-bold uppercase hidden sm:inline">{item.brand}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <span className="text-[9px] text-neutral-600 font-mono font-bold uppercase sm:hidden">{item.brand}</span>
                                                                <span className="text-[9px] text-neutral-600 font-mono font-bold">ID: {item.id.slice(0, 8)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 flex-shrink-0">
                                                        {/* Stock bar */}
                                                        <div className="flex flex-col gap-1 w-28 sm:w-36">
                                                            <div className="flex justify-between text-[10px] font-bold">
                                                                <span className={cn(isLow ? "text-brand-orange" : "text-white")}>
                                                                    {currentStock.toFixed(0)}g
                                                                </span>
                                                                <span className="text-neutral-500">{(item.initialWeight || 1000).toFixed(0)}g</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        "h-full transition-all duration-500",
                                                                        isLow
                                                                            ? 'bg-brand-orange shadow-[0_0_10px_rgba(255,102,0,0.5)]'
                                                                            : 'bg-brand-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                                                                    )}
                                                                    style={{ width: `${Math.min((currentStock / (item.initialWeight || 1000)) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Price */}
                                                        <span className="text-xs font-black text-green-500 w-20 sm:w-24 text-right">
                                                            {fmt(item.pricePerKg)}
                                                        </span>

                                                        {/* Status */}
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] font-black tracking-widest uppercase border w-20 sm:w-24 text-center",
                                                            isLow
                                                                ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                                                                : 'bg-green-500/10 text-green-500 border-green-500/20'
                                                        )}>
                                                            {isLow ? '⚠ BAJO' : '✅ OK'}
                                                        </span>

                                                        {/* Options */}
                                                        <Tooltip content="Editar o eliminar material">
                                                            <button
                                                                onClick={() => openEdit(item)}
                                                                className="p-2 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded-lg transition-all tap-target"
                                                            >
                                                                <MoreHorizontal size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-brand-orange/5 border border-brand-orange/20 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">Valor Total Inventario</div>
                    <div className="text-2xl font-black text-white">{fmt(totalInventoryValue)}</div>
                </div>
                <div className="p-6 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-1">Alertas de Reposición</div>
                    <div className="text-2xl font-black text-white">{lowStockAlerts} Materiales</div>
                </div>
                <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Material más popular</div>
                    <div className="text-lg font-black text-white uppercase tracking-tighter">
                        {materials.length > 0
                            ? (() => {
                                const counts: Record<string, number> = {}
                                for (const m of materials) {
                                    const type = m.type
                                    counts[type] = (counts[type] || 0) + 1
                                }
                                const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
                                return top ? `${top[0]} (${top[1]})` : '—'
                              })()
                            : '—'}
                    </div>
                </div>
            </div>

            {/* Low stock alerts */}
            {lowStockMaterials.length > 0 && (
                <div className="p-5 bg-brand-orange/5 border border-brand-orange/20 rounded-3xl backdrop-blur-md">
                    <h3 className="text-xs font-black text-brand-orange uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="animate-pulse">⚠</span> Materiales por debajo de 200g
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {lowStockMaterials.map(m => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    setActiveFilter(m.type)
                                    setExpandedType(m.type)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] font-bold text-neutral-300 hover:text-brand-orange hover:border-brand-orange/30 transition-all flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                {m.name}
                                <span className="text-brand-orange font-black">{getMaterialStock(m).toFixed(0)}g</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ADD MATERIAL MODAL */}
            <Modal
                isOpen={isAddMaterialModalOpen}
                onClose={() => setIsAddMaterialModalOpen(false)}
                title={Dictionary.inventory.addBtn}
            >
                <form className="space-y-6" onSubmit={handleAddMaterial}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Nombre ({Dictionary.inventory.itemLabel})</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-3.5 text-neutral-600" size={14} />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej: PLA Premium Black"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pl-10 text-sm focus:border-brand-orange transition-all outline-none text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Marca / Fabricante</label>
                            <input
                                type="text"
                                required
                                value={formData.brand}
                                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                placeholder="Ej: Grilon3"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">{Dictionary.inventory.categoryLabel}</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({...formData, type: e.target.value})}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white appearance-none"
                            >
                                {Dictionary.inventory.categories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Selector de Color</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({...formData, color: e.target.value})}
                                className="w-full h-11 bg-neutral-900 border border-neutral-800 rounded-xl cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">{Dictionary.inventory.metric1} Inicial</label>
                            <div className="relative">
                                <Scale className="absolute left-3 top-3.5 text-neutral-600" size={14} />
                                <input
                                    type="number"
                                    required
                                    value={formData.initialWeight}
                                    onChange={(e) => setFormData({...formData, initialWeight: e.target.value})}
                                    placeholder="1000"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pl-10 text-sm focus:border-brand-orange transition-all outline-none text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">{Dictionary.inventory.metricPrice}</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3.5 text-neutral-600" size={14} />
                                <input
                                    type="number"
                                    required
                                    value={formData.pricePerKg}
                                    onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
                                    placeholder="12.50"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pl-10 text-sm focus:border-brand-orange transition-all outline-none text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Tooltip content="Descartar cambios y cerrar formulario">
                            <button
                                type="button"
                                onClick={() => setIsAddMaterialModalOpen(false)}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all text-neutral-400 disabled:opacity-50 tap-target"
                            >
                                DESCARTAR
                            </button>
                        </Tooltip>
                        <Tooltip content="Agregar material al inventario y actualizar stock">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-3 bg-brand-cyan text-black font-black text-xs rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 tap-target"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'SINCRONIZAR STOCK'}
                            </button>
                        </Tooltip>
                    </div>
                </form>
            </Modal>

            {/* EDIT MATERIAL MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingMaterial(null); setConfirmDelete(null) }}
                title="Editar Material"
            >
                {editingMaterial && (
                    <form className="space-y-6" onSubmit={handleUpdate}>
                        {/* Preview header */}
                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="w-12 h-12 rounded-xl border border-neutral-800 flex items-center justify-center p-1.5 shrink-0"
                                 style={{ backgroundColor: `${editingMaterial.color}20` }}>
                                <div className="w-full h-full rounded-sm" style={{ backgroundColor: editingMaterial.color }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{editingMaterial.name}</p>
                                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                    {editingMaterial.type} · {editingMaterial.brand} · ID: {editingMaterial.id.slice(0, 8)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Nombre</label>
                                <input
                                    type="text" required
                                    value={editForm.name}
                                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white tap-target"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Marca</label>
                                <input
                                    type="text" required
                                    value={editForm.brand}
                                    onChange={e => setEditForm({...editForm, brand: e.target.value})}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white tap-target"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Tipo</label>
                                <select
                                    value={editForm.type}
                                    onChange={e => setEditForm({...editForm, type: e.target.value})}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white appearance-none tap-target"
                                >
                                    {Dictionary.inventory.categories.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Color</label>
                                <input
                                    type="color"
                                    value={editForm.color}
                                    onChange={e => setEditForm({...editForm, color: e.target.value})}
                                    className="w-full h-11 bg-neutral-900 border border-neutral-800 rounded-xl cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Stock (gramos)</label>
                                <input
                                    type="number" required min="0"
                                    value={editForm.stock_units}
                                    onChange={e => setEditForm({...editForm, stock_units: parseInt(e.target.value) || 0})}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white tap-target"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Precio / Kg</label>
                                <input
                                    type="number" required min="0"
                                    value={editForm.pricePerKg}
                                    onChange={e => setEditForm({...editForm, pricePerKg: parseFloat(e.target.value) || 0})}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white tap-target"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            {/* Delete */}
                            {confirmDelete === editingMaterial.id ? (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(null)}
                                        className="px-3 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] font-bold text-neutral-400 hover:bg-neutral-800 transition-all tap-target"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingMaterial.id)}
                                        className="px-3 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-500/20 transition-all tap-target flex items-center gap-1"
                                    >
                                        <Trash2 size={14} /> CONFIRMAR ELIMINAR
                                    </button>
                                </div>
                            ) : (
                                <Tooltip content="Eliminar material permanentemente">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(editingMaterial.id)}
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-all tap-target"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip content="Cancelar edición">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditModalOpen(false); setEditingMaterial(null); setConfirmDelete(null) }}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 hover:bg-neutral-800 transition-all tap-target disabled:opacity-50"
                                >
                                    CANCELAR
                                </button>
                            </Tooltip>
                            <Tooltip content="Guardar cambios">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 tap-target disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'GUARDAR CAMBIOS'}
                                </button>
                            </Tooltip>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    )
}
