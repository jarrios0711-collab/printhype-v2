'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Plus,
    FileText,
    DollarSign,
    Clock,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Loader2,
    Upload,
    Send,
    ChevronRight,
    Percent,
    Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Tooltip from '@/components/ui/Tooltip'
import { ToastProvider, useToast } from '@/components/ui/Toast'

// --- Types ---

interface Budget {
    id: string
    clientName: string
    jobName: string
    status: 'DRAFT' | 'SENT' | 'APPROVED'
    materialId: string | null
    filamentGrams: number
    printHours: number
    energyCost: number
    laborCost: number
    materialCost: number
    totalCost: number
    salePrice: number
    profitPercent: number
    profitAmount: number
    marginPercent: number
    notes: string
    createdAt: string
}

interface Material {
    id: string
    name: string
    brand: string
    type: string
    color: string
    pricePerKg: number
}

interface Settings {
    kwhPrice: number
    laborHourPrice: number
    profitMargin: number
    currency: string
}

// --- Constants ---

const DENSITY_MAP: Record<string, number> = {
    PLA: 1.24,
    'PLA+': 1.24,
    PETG: 1.27,
    TPU: 1.21,
    'Resina UV': 1.15,
    'ABS / ASA': 1.04,
    'Nylon / PA': 1.14,
    'PC (Policarbonato)': 1.20,
    HIPS: 1.03,
    PVA: 1.23,
    'Carbon Fiber': 1.30,
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    SENT: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
    APPROVED: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const statusIcons: Record<string, string> = {
    DRAFT: '📝',
    SENT: '📤',
    APPROVED: '✅',
}

// --- STL Parser ---

/**
 * Parsea un STL binario y calcula el volumen real del mesh usando
 * signed mesh volume (suma de tetraedros). Es el método estándar
 * para STL watertight y da valores precisos independientemente de
 * si la pieza es sólida, hueca, o tiene geometría compleja.
 */
function parseBinarySTL(buffer: ArrayBuffer): { volumeCm3: number; triangleCount: number; dimensions: { x: number; y: number; z: number } } {
    const dv = new DataView(buffer)
    const triangleCount = dv.getUint32(80, true)
    if (triangleCount === 0 || triangleCount > 10000000) {
        return { volumeCm3: 0, triangleCount: 0, dimensions: { x: 0, y: 0, z: 0 } }
    }

    let signedVolume = 0
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    let offset = 84

    for (let i = 0; i < triangleCount && offset + 50 <= buffer.byteLength; i++) {
        offset += 12 // skip normal vector

        const ax = dv.getFloat32(offset, true),      ay = dv.getFloat32(offset + 4, true),      az = dv.getFloat32(offset + 8, true)
        const bx = dv.getFloat32(offset + 12, true), by = dv.getFloat32(offset + 16, true), bz = dv.getFloat32(offset + 20, true)
        const cx = dv.getFloat32(offset + 24, true), cy = dv.getFloat32(offset + 28, true), cz = dv.getFloat32(offset + 32, true)
        offset += 36
        offset += 2 // skip attribute byte count

        // Signed volume of tetrahedron formed by triangle and origin
        // V = (1/6) * dot(a, cross(b, c))
        signedVolume += (ax * (by * cz - bz * cy)
                       + ay * (bz * cx - bx * cz)
                       + az * (bx * cy - by * cx)) / 6.0

        // Track bounding box for dimension display
        if (ax < minX) minX = ax; if (ax > maxX) maxX = ax
        if (ay < minY) minY = ay; if (ay > maxY) maxY = ay
        if (az < minZ) minZ = az; if (az > maxZ) maxZ = az
        if (bx < minX) minX = bx; if (bx > maxX) maxX = bx
        if (by < minY) minY = by; if (by > maxY) maxY = by
        if (bz < minZ) minZ = bz; if (bz > maxZ) maxZ = bz
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy
        if (cz < minZ) minZ = cz; if (cz > maxZ) maxZ = cz
    }

    // Volume in mm³ → cm³
    const volumeMm3 = Math.abs(signedVolume)
    const volumeCm3 = volumeMm3 / 1000

    const dimensions = {
        x: Math.max(maxX - minX, 0),
        y: Math.max(maxY - minY, 0),
        z: Math.max(maxZ - minZ, 0),
    }

    return { volumeCm3, triangleCount, dimensions }
}

// --- Page Component ---

function BudgetsPage() {
    const { showToast } = useToast()

    const [budgets, setBudgets] = useState<Budget[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [settings, setSettings] = useState<Settings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'STL' | 'MANUAL'>('MANUAL')

    // STL state
    const [stlFile, setStlFile] = useState<File | null>(null)
    const [stlResult, setStlResult] = useState<{ volumeCm3: number; triangleCount: number } | null>(null)
    const [isParsingStl, setIsParsingStl] = useState(false)

    // Form state (create)
    const initialForm = {
        clientName: '',
        jobName: '',
        materialId: '',
        filamentGrams: 0,
        printHours: 0,
        energyCost: 0,
        laborCost: 0,
        marginPercent: 150,
        notes: '',
    }
    const [form, setForm] = useState(initialForm)

    // Edit form state
    const [editForm, setEditForm] = useState({
        clientName: '',
        jobName: '',
        status: 'DRAFT' as string,
        materialId: '',
        filamentGrams: 0,
        printHours: 0,
        energyCost: 0,
        laborCost: 0,
        marginPercent: 150,
        notes: '',
    })

    // --- Data fetching ---

    const fetchBudgets = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/budgets')
            const data = await res.json()
            if (!data.error) setBudgets(data)
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchMaterials = async () => {
        try {
            const res = await fetch('/api/inventory')
            const data = await res.json()
            if (!data.error) setMaterials(data)
        } catch (err) {
            console.error(err)
        }
    }

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings')
            const data = await res.json()
            if (!data.error) {
                setSettings(data)
                setForm(prev => ({
                    ...prev,
                    energyCost: (data.kwhPrice || 120.50) * 0.5,
                    laborCost: data.laborHourPrice || 800,
                    marginPercent: (data.profitMargin || 1.5) * 100,
                }))
            }
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => {
        fetchBudgets()
        fetchMaterials()
        fetchSettings()
    }, [])

    // --- Real-time calculation (create) ---

    const calculations = useMemo(() => {
        const material = materials.find(m => m.id === form.materialId)
        const matCost = material ? (form.filamentGrams / 1000) * material.pricePerKg : 0
        const energy = form.printHours * form.energyCost
        const labor = form.printHours * form.laborCost
        const total = matCost + energy + labor
        const marginPct = form.marginPercent / 100
        const sale = total * (1 + marginPct)
        const profit = sale - total
        const margin = sale > 0 ? (profit / sale) * 100 : 0
        return {
            materialCost: matCost,
            energyCost: energy,
            laborCost: labor,
            totalCost: total,
            salePrice: sale,
            profitAmount: profit,
            marginPercent: margin,
        }
    }, [form.materialId, form.filamentGrams, form.printHours, form.energyCost, form.laborCost, form.marginPercent, materials])

    // Real-time calculation for edit
    const editCalculations = useMemo(() => {
        const material = materials.find(m => m.id === editForm.materialId)
        const matCost = material ? (editForm.filamentGrams / 1000) * material.pricePerKg : 0
        const energy = editForm.printHours * editForm.energyCost
        const labor = editForm.printHours * editForm.laborCost
        const total = matCost + energy + labor
        const marginPct = editForm.marginPercent / 100
        const sale = total * (1 + marginPct)
        const profit = sale - total
        const margin = sale > 0 ? (profit / sale) * 100 : 0
        return {
            materialCost: matCost,
            energyCost: energy,
            laborCost: labor,
            totalCost: total,
            salePrice: sale,
            profitAmount: profit,
            marginPercent: margin,
        }
    }, [editForm.materialId, editForm.filamentGrams, editForm.printHours, editForm.energyCost, editForm.laborCost, editForm.marginPercent, materials])

    // --- STL handlers ---

    const handleStlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setStlFile(file)
        setIsParsingStl(true)
        setStlResult(null)

        try {
            const buffer = await file.arrayBuffer()
            const result = parseBinarySTL(buffer)
            setStlResult(result)

            if (result.volumeCm3 > 0 && form.materialId) {
                const material = materials.find(m => m.id === form.materialId)
                if (material) {
                    const density = DENSITY_MAP[material.type] || 1.24
                    const grams = Math.round(result.volumeCm3 * density)
                    const hours = Math.round((result.volumeCm3 / 8 + 0.5) * 10) / 10
                    setForm(prev => ({ ...prev, filamentGrams: grams, printHours: hours }))
                }
            }
        } catch (err) {
            console.error('Error parsing STL:', err)
            showToast('Error al analizar el archivo STL', 'error')
        } finally {
            setIsParsingStl(false)
        }
    }

    const applyStlValues = () => {
        if (!stlResult || !form.materialId) return
        const material = materials.find(m => m.id === form.materialId)
        if (!material) return
        const density = DENSITY_MAP[material.type] || 1.24
        const grams = Math.round(stlResult.volumeCm3 * density)
        const hours = Math.round((stlResult.volumeCm3 / 8 + 0.5) * 10) / 10
        setForm(prev => ({ ...prev, filamentGrams: grams, printHours: hours }))
        showToast(`Valores aplicados: ${grams}g / ${hours}h`, 'success')
    }

    const selectedDensity = useMemo(() => {
        if (!form.materialId) return null
        const material = materials.find(m => m.id === form.materialId)
        return material ? DENSITY_MAP[material.type] || 1.24 : null
    }, [form.materialId, materials])

    // --- CRUD handlers ---

    const resetForm = () => {
        setForm({
            ...initialForm,
            energyCost: settings ? settings.kwhPrice * 0.5 : 60.25,
            laborCost: settings?.laborHourPrice || 800,
            marginPercent: settings ? settings.profitMargin * 100 : 150,
        })
        setStlFile(null)
        setStlResult(null)
        setActiveTab('MANUAL')
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.clientName || !form.jobName) {
            showToast('Completá cliente y trabajo', 'error')
            return
        }
        setIsSaving(true)
        try {
            const res = await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: form.clientName,
                    jobName: form.jobName,
                    materialId: form.materialId || null,
                    filamentGrams: form.filamentGrams,
                    printHours: form.printHours,
                    energyCost: calculations.energyCost,
                    laborCost: calculations.laborCost,
                    materialCost: calculations.materialCost,
                    totalCost: calculations.totalCost,
                    salePrice: calculations.salePrice,
                    profitPercent: form.marginPercent,
                    profitAmount: calculations.profitAmount,
                    marginPercent: calculations.marginPercent,
                    notes: form.notes,
                }),
            })
            const data = await res.json()
            if (data.error) {
                showToast(data.error, 'error')
            } else {
                setBudgets([data, ...budgets])
                setShowCreateModal(false)
                resetForm()
                showToast('Presupuesto creado', 'success')
            }
        } catch (err) {
            console.error(err)
            showToast('Error al crear presupuesto', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const openEdit = (budget: Budget) => {
        setEditingBudget(budget)
        // Load the margin back as a percentage for the slider
        const marginPct = budget.profitPercent > 0 ? budget.profitPercent : (settings?.profitMargin || 1.5) * 100
        setEditForm({
            clientName: budget.clientName,
            jobName: budget.jobName,
            status: budget.status,
            materialId: budget.materialId || '',
            filamentGrams: budget.filamentGrams,
            printHours: budget.printHours,
            energyCost: budget.energyCost,
            laborCost: budget.laborCost,
            marginPercent: marginPct,
            notes: budget.notes,
        })
        setConfirmDelete(null)
        setShowEditModal(true)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingBudget) return
        setIsSaving(true)
        try {
            const res = await fetch(`/api/budgets/${editingBudget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: editForm.clientName,
                    jobName: editForm.jobName,
                    status: editForm.status,
                    materialId: editForm.materialId || null,
                    filamentGrams: editForm.filamentGrams,
                    printHours: editForm.printHours,
                    energyCost: editCalculations.energyCost,
                    laborCost: editCalculations.laborCost,
                    materialCost: editCalculations.materialCost,
                    totalCost: editCalculations.totalCost,
                    salePrice: editCalculations.salePrice,
                    profitPercent: editForm.marginPercent,
                    profitAmount: editCalculations.profitAmount,
                    marginPercent: editCalculations.marginPercent,
                    notes: editForm.notes,
                }),
            })
            const data = await res.json()
            if (data.error) {
                showToast(data.error, 'error')
            } else {
                setBudgets(prev => prev.map(b => b.id === editingBudget.id ? data : b))
                setShowEditModal(false)
                setEditingBudget(null)
                showToast('Presupuesto actualizado', 'success')
            }
        } catch (err) {
            console.error(err)
            showToast('Error al actualizar', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!editingBudget) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/budgets/${editingBudget.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.error) {
                showToast(data.error, 'error')
            } else {
                setBudgets(prev => prev.filter(b => b.id !== editingBudget.id))
                setShowEditModal(false)
                setEditingBudget(null)
                showToast('Presupuesto eliminado', 'success')
            }
        } catch (err) {
            console.error(err)
            showToast('Error al eliminar', 'error')
        } finally {
            setIsDeleting(false)
        }
    }

    // --- Stats ---

    const stats = useMemo(() => {
        const total = budgets.length
        const sent = budgets.filter(b => b.status === 'SENT').length
        const approved = budgets.filter(b => b.status === 'APPROVED').length
        return { total, sent, approved }
    }, [budgets])

    // --- Format helpers ---

    const fmt = (n: number) => {
        if (n === 0) return '$0'
        if (Math.abs(n) < 1) return `$${n.toFixed(2)}`
        return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    }

    const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })

    // --- Render ---

    return (
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Presupuestos</h1>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1">Cotizaciones y control de ganancias.</p>
                </div>
                <Tooltip content="Crear nuevo presupuesto">
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true) }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-lg shadow-brand-orange/20 w-full sm:w-auto justify-center tap-target"
                    >
                        <Plus size={16} /> NUEVO PRESUPUESTO
                    </button>
                </Tooltip>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <div className="p-5 sm:p-6 bg-neutral-950/40 border border-neutral-900 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Total</div>
                    <div className="text-xl sm:text-2xl font-black text-white">{stats.total}</div>
                </div>
                <div className="p-5 sm:p-6 bg-neutral-950/40 border border-neutral-900 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-1">Enviados</div>
                    <div className="text-xl sm:text-2xl font-black text-brand-cyan">{stats.sent}</div>
                </div>
                <div className="p-5 sm:p-6 bg-neutral-950/40 border border-neutral-900 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Aprobados</div>
                    <div className="text-xl sm:text-2xl font-black text-green-500">{stats.approved}</div>
                </div>
            </div>

            {/* Budgets Table */}
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl overflow-hidden backdrop-blur-md">
                <table className="w-full text-left border-collapse responsive-table">
                    <thead>
                        <tr className="border-b border-neutral-900 bg-white/5">
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Cliente</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Trabajo</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Costo</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Precio Venta</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Margen</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Estado</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="p-16 text-center">
                                    <Loader2 size={24} className="animate-spin mx-auto text-brand-orange mb-4" />
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Cargando presupuestos...</p>
                                </td>
                            </tr>
                        ) : budgets.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-16 text-center">
                                    <FileText size={40} className="mx-auto text-neutral-800 mb-4" />
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No hay presupuestos aún.</p>
                                    <p className="text-[10px] text-neutral-600 mt-1">Crea el primero para empezar a cotizar.</p>
                                </td>
                            </tr>
                        ) : (
                            budgets.map((b) => (
                                <tr
                                    key={b.id}
                                    onClick={() => openEdit(b)}
                                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                >
                                    <td className="p-5" data-label="Cliente">
                                        <span className="font-bold text-sm text-white">{b.clientName}</span>
                                    </td>
                                    <td className="p-5" data-label="Trabajo">
                                        <span className="text-xs font-bold text-neutral-300">{b.jobName}</span>
                                    </td>
                                    <td className="p-5 font-black text-sm text-neutral-400" data-label="Costo">
                                        {fmt(b.totalCost)}
                                    </td>
                                    <td className="p-5 font-black text-sm text-brand-orange" data-label="Precio">
                                        {fmt(b.salePrice)}
                                    </td>
                                    <td className="p-5" data-label="Margen">
                                        <span className={cn(
                                            "text-xs font-black",
                                            b.marginPercent >= 30 ? 'text-green-500' :
                                            b.marginPercent >= 10 ? 'text-brand-cyan' : 'text-yellow-500'
                                        )}>
                                            {fmtPct(b.marginPercent)}
                                        </span>
                                    </td>
                                    <td className="p-5" data-label="Estado">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest border",
                                            statusColors[b.status]
                                        )}>
                                            {statusIcons[b.status]} {b.status}
                                        </span>
                                    </td>
                                    <td className="p-5 text-[10px] text-neutral-500 font-bold" data-label="Fecha">
                                        {fmtDate(b.createdAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ============ CREATE MODAL ============ */}
            <div className={showCreateModal ? 'fixed inset-0 z-[60]' : 'hidden'}>
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setShowCreateModal(false)}></div>
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-2 sm:p-4">
                    <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95dvh] sm:max-h-[98vh] mx-auto flex flex-col">
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-900 bg-white/5 shrink-0">
                            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">Nuevo Presupuesto</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-xl transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                            <form className="space-y-2.5" onSubmit={handleCreate}>
                    {/* Mode Tabs */}
                    <div className="flex bg-neutral-900 p-0.5 rounded-lg">
                        {(['MANUAL', 'STL'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab
                                        ? 'bg-neutral-800 text-white'
                                        : 'text-neutral-500 hover:text-white'
                                )}
                            >
                                {tab === 'STL' ? '📐 STL AUTO' : '✏️ MANUAL'}
                            </button>
                        ))}
                    </div>

                    {/* STL Upload */}
                    {activeTab === 'STL' && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-neutral-800 rounded-2xl p-6 text-center hover:border-brand-orange/50 transition-all">
                                <input
                                    type="file"
                                    accept=".stl"
                                    onChange={handleStlFile}
                                    className="hidden"
                                    id="stl-upload"
                                />
                                <label htmlFor="stl-upload" className="cursor-pointer block">
                                    <Upload size={32} className="mx-auto text-neutral-600 mb-3" />
                                    <p className="text-xs font-bold text-neutral-400">
                                        {stlFile ? stlFile.name : 'Subir archivo .STL'}
                                    </p>
                                    <p className="text-[9px] text-neutral-600 mt-1">
                                        {stlFile
                                            ? `${(stlFile.size / 1024 / 1024).toFixed(1)} MB`
                                            : 'Arrastrá o hacé clic para seleccionar'}
                                    </p>
                                </label>
                            </div>

                            {isParsingStl && (
                                <div className="flex items-center gap-2 text-brand-cyan text-[10px] font-bold">
                                    <Loader2 size={12} className="animate-spin" /> Analizando geometría STL...
                                </div>
                            )}

                            {stlResult && !isParsingStl && (
                                <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl space-y-2">
                                    <p className="text-[10px] font-black text-brand-cyan uppercase tracking-widest">📐 Resultado STL</p>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div>
                                            <p className="text-[8px] text-neutral-500 font-black uppercase">Volumen</p>
                                            <p className="text-sm font-black text-white">{stlResult.volumeCm3.toFixed(1)} cm³</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-neutral-500 font-black uppercase">Triángulos</p>
                                            <p className="text-sm font-black text-white">{stlResult.triangleCount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-neutral-500 font-black uppercase">Densidad</p>
                                            <p className="text-sm font-black text-white">{selectedDensity ? `${selectedDensity} g/cm³` : '—'}</p>
                                        </div>
                                    </div>
                                    {selectedDensity && (
                                        <div className="flex justify-center mt-1">
                                            <button
                                                type="button"
                                                onClick={applyStlValues}
                                                className="px-4 py-1.5 bg-brand-cyan/20 rounded-lg text-[9px] font-black text-brand-cyan hover:bg-brand-cyan/30 transition-all"
                                            >
                                                APLICAR VALORES AL FORMULARIO
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Client & Job */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Cliente *</label>
                            <input
                                type="text" required
                                value={form.clientName}
                                onChange={e => setForm({ ...form, clientName: e.target.value })}
                                placeholder="Nombre del cliente"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white tap-target"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Trabajo *</label>
                            <input
                                type="text" required
                                value={form.jobName}
                                onChange={e => setForm({ ...form, jobName: e.target.value })}
                                placeholder="Nombre del trabajo"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white tap-target"
                            />
                        </div>
                    </div>

                    {/* Material */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase">Material</label>
                        <select
                            value={form.materialId}
                            onChange={e => setForm({ ...form, materialId: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white appearance-none tap-target"
                        >
                            <option value="">Sin material</option>
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name} ({m.type}) — {m.brand}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Grams & Hours */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">
                                Filamento <span className="text-neutral-600">(gramos)</span>
                            </label>
                            <input
                                type="number" min="0" step="1"
                                value={form.filamentGrams}
                                onChange={e => setForm({ ...form, filamentGrams: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white tap-target"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">
                                Horas <span className="text-neutral-600">(impresión)</span>
                            </label>
                            <input
                                type="number" min="0" step="0.5"
                                value={form.printHours}
                                onChange={e => setForm({ ...form, printHours: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white tap-target"
                            />
                        </div>
                    </div>

                    {/* Energy & Labor costs per hour */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">
                                Energía <span className="text-neutral-600">($/hora)</span>
                            </label>
                            <input
                                type="number" min="0" step="0.1"
                                value={form.energyCost}
                                onChange={e => setForm({ ...form, energyCost: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white tap-target"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">
                                Mano de obra <span className="text-neutral-600">($/hora)</span>
                            </label>
                            <input
                                type="number" min="0" step="1"
                                value={form.laborCost}
                                onChange={e => setForm({ ...form, laborCost: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white tap-target"
                            />
                        </div>
                    </div>

                    {/* Margin Slider */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Margen de ganancia</label>
                            <span className="text-xs font-black text-brand-orange">{form.marginPercent}%</span>
                        </div>
                        <input
                            type="range" min="0" max="500" step="5"
                            value={form.marginPercent}
                            onChange={e => setForm({ ...form, marginPercent: parseInt(e.target.value) })}
                            className="w-full h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer accent-brand-orange"
                        />
                        <div className="flex justify-between text-[8px] text-neutral-600 font-bold">
                            <span>0%</span>
                            <span>250%</span>
                            <span>500%</span>
                        </div>
                    </div>

                    {/* Real-time Results */}
                    <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">📊 Resultado</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[8px] text-neutral-600 font-black uppercase">Material</p>
                                <p className="text-sm font-black text-white">{fmt(calculations.materialCost)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-neutral-600 font-black uppercase">Energía</p>
                                <p className="text-sm font-black text-white">{fmt(calculations.energyCost)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-neutral-600 font-black uppercase">Mano de Obra</p>
                                <p className="text-sm font-black text-white">{fmt(calculations.laborCost)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-neutral-600 font-black uppercase">Costo Total</p>
                                <p className="text-sm font-black text-neutral-400">{fmt(calculations.totalCost)}</p>
                            </div>
                        </div>
                        <div className="h-px bg-white/5"></div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[8px] text-brand-orange font-black uppercase">Precio Venta</p>
                                <p className="text-lg font-black text-brand-orange">{fmt(calculations.salePrice)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-green-500 font-black uppercase">Ganancia</p>
                                <p className="text-lg font-black text-green-500">{fmt(calculations.profitAmount)}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-brand-cyan font-black uppercase">Margen</p>
                                <p className={cn(
                                    "text-lg font-black",
                                    calculations.marginPercent >= 30 ? 'text-green-500' :
                                    calculations.marginPercent >= 10 ? 'text-brand-cyan' : 'text-yellow-500'
                                )}>
                                    {fmtPct(calculations.marginPercent)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase">Notas <span className="text-neutral-600">(opcional)</span></label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                            placeholder="Detalles adicionales del presupuesto..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-orange text-white resize-none tap-target"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Tooltip content="Descartar">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 hover:bg-neutral-800 transition-all tap-target"
                            >
                                CANCELAR
                            </button>
                        </Tooltip>
                        <Tooltip content="Guardar presupuesto">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 tap-target"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'GUARDAR PRESUPUESTO'}
                            </button>
                        </Tooltip>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ EDIT MODAL ============ */}
            <div className={showEditModal ? 'fixed inset-0 z-[60]' : 'hidden'}>
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => { setShowEditModal(false); setEditingBudget(null); setConfirmDelete(null) }}></div>
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-2 sm:p-4">
                    <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95dvh] sm:max-h-[98vh] mx-auto flex flex-col">
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-900 bg-white/5 shrink-0">
                            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">Editar Presupuesto</h3>
                            <button onClick={() => { setShowEditModal(false); setEditingBudget(null); setConfirmDelete(null) }} className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-xl transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                {editingBudget && (
                    <form className="space-y-2.5" onSubmit={handleUpdate}>
                        {/* Client & Job */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Cliente</label>
                                <input
                                    type="text" required
                                    value={editForm.clientName}
                                    onChange={e => setEditForm({ ...editForm, clientName: e.target.value })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white tap-target"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Trabajo</label>
                                <input
                                    type="text" required
                                    value={editForm.jobName}
                                    onChange={e => setEditForm({ ...editForm, jobName: e.target.value })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange text-white tap-target"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Estado</label>
                            <select
                                value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white appearance-none tap-target"
                            >
                                <option value="DRAFT">📝 DRAFT</option>
                                <option value="SENT">📤 SENT</option>
                                <option value="APPROVED">✅ APPROVED</option>
                            </select>
                        </div>

                        {/* Material */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Material</label>
                            <select
                                value={editForm.materialId}
                                onChange={e => setEditForm({ ...editForm, materialId: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white appearance-none tap-target"
                            >
                                <option value="">Sin material</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                                ))}
                            </select>
                        </div>

                        {/* Grams & Hours */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Gramos</label>
                                <input type="number" min="0"
                                    value={editForm.filamentGrams}
                                    onChange={e => setEditForm({ ...editForm, filamentGrams: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white tap-target"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Horas</label>
                                <input type="number" min="0" step="0.5"
                                    value={editForm.printHours}
                                    onChange={e => setEditForm({ ...editForm, printHours: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white tap-target"
                                />
                            </div>
                        </div>

                        {/* Energy & Labor */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Energía $/h</label>
                                <input type="number" min="0" step="0.1"
                                    value={editForm.energyCost}
                                    onChange={e => setEditForm({ ...editForm, energyCost: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white tap-target"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Mano obra $/h</label>
                                <input type="number" min="0" step="1"
                                    value={editForm.laborCost}
                                    onChange={e => setEditForm({ ...editForm, laborCost: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm outline-none text-white tap-target"
                                />
                            </div>
                        </div>

                        {/* Margin slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Margen</label>
                                <span className="text-xs font-black text-brand-orange">{editForm.marginPercent}%</span>
                            </div>
                            <input type="range" min="0" max="500" step="5"
                                value={editForm.marginPercent}
                                onChange={e => setEditForm({ ...editForm, marginPercent: parseInt(e.target.value) })}
                                className="w-full h-2 bg-neutral-900 rounded-full appearance-none cursor-pointer accent-brand-orange"
                            />
                        </div>

                        {/* Results */}
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">📊 Resultado</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-[8px] text-neutral-600 font-black uppercase">Costo</p>
                                    <p className="text-base font-black text-neutral-400">{fmt(editCalculations.totalCost)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-brand-orange font-black uppercase">Venta</p>
                                    <p className="text-base font-black text-brand-orange">{fmt(editCalculations.salePrice)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-green-500 font-black uppercase">Margen</p>
                                    <p className={cn(
                                        "text-base font-black",
                                        editCalculations.marginPercent >= 30 ? 'text-green-500' : 'text-brand-cyan'
                                    )}>
                                        {fmtPct(editCalculations.marginPercent)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Notas</label>
                            <textarea
                                value={editForm.notes}
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                rows={2}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none text-white resize-none tap-target"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-2">
                            {confirmDelete === editingBudget.id ? (
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setConfirmDelete(null)}
                                        className="px-3 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-[10px] font-bold text-neutral-400 tap-target">
                                        CANCELAR
                                    </button>
                                    <button type="button" onClick={handleDelete} disabled={isDeleting}
                                        className="px-3 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 flex items-center gap-1 tap-target">
                                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} CONFIRMAR
                                    </button>
                                </div>
                            ) : (
                                <Tooltip content="Eliminar presupuesto">
                                    <button type="button" onClick={() => setConfirmDelete(editingBudget.id)}
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-all tap-target">
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            )}
                            <button type="button" onClick={() => { setShowEditModal(false); setEditingBudget(null); setConfirmDelete(null) }}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 tap-target">
                                CANCELAR
                            </button>
                            <Tooltip content="Guardar cambios">
                                <button type="submit" disabled={isSaving}
                                    className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 tap-target">
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'GUARDAR'}
                                </button>
                            </Tooltip>
                            </div>
                        </form>
                    )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function BudgetsWithProvider() {
    return (
        <ToastProvider>
            <BudgetsPage />
        </ToastProvider>
    )
}
