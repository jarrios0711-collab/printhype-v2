'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { 
    Plus, 
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    Truck,
    AlertCircle,
    User,
    Package,
    FileSpreadsheet
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { Dictionary } from '@/config/dictionary'
import { paginate, exportToCSV, formatCurrency } from '@/lib/pagination'

const ITEMS_PER_PAGE = 20

const getWaUrl = (phone: string, name: string, project: string) => {
    if (!phone) return '#'
    let c = phone.replace(/\D/g, '')
    if (c.startsWith('0')) c = c.substring(1)
    if (!c.startsWith('549') && !c.startsWith('54') && c.length === 10) c = '549' + c
    if (c.startsWith('54') && !c.startsWith('549')) c = '549' + c.substring(2)
    const msg = `Hola ${name}, te contacto de JR3D sobre tu pedido de ${project}.`
    return `https://wa.me/${c}?text=${encodeURIComponent(msg)}`
}

function OrdersPage() {
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
    const [orders, setOrders] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        priority: 'NORMAL',
        totalPrice: '',
        projectName: '',
        materialId: '',
        weightGrams: ''
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const [materials, setMaterials] = useState<any[]>([])

    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [showExportMenu, setShowExportMenu] = useState(false)

    const { showToast } = useToast()

    const filteredOrders = useMemo(() => {
        let result = [...orders]

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(o =>
                o.customerName?.toLowerCase().includes(q) ||
                o.id?.toLowerCase().includes(q) ||
                o.items?.[0]?.projectName?.toLowerCase().includes(q)
            )
        }

        if (statusFilter) {
            result = result.filter(o => o.status === statusFilter)
        }

        return result
    }, [orders, searchQuery, statusFilter])

    const fetchMaterials = async () => {
        try {
            const res = await fetch('/api/inventory')
            const data = await res.json()
            if (!data.error) {
                setMaterials(data)
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, materialId: data[0].id }))
                }
            }
        } catch (err) {
            console.error('Error fetching materials:', err)
        }
    }

    const fetchOrders = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/orders')
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setOrders(data)
        } catch (err: any) {
            setError(err.message || 'Error de conexión con el taller')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
        fetchMaterials()
    }, [])

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormErrors({})
        
        const errors: Record<string, string> = {}
        if (!formData.customerName || formData.customerName.length < 2) errors.customerName = 'El nombre debe tener al menos 2 caracteres'
        if (!formData.totalPrice || parseFloat(formData.totalPrice) <= 0) errors.totalPrice = 'El precio debe ser mayor a 0'
        if (!formData.projectName || formData.projectName.length < 2) errors.projectName = 'El nombre del proyecto debe tener al menos 2 caracteres'
        if (!formData.materialId) errors.materialId = 'Selecciona un material'
        if (!formData.weightGrams || parseFloat(formData.weightGrams) <= 0) errors.weightGrams = 'El peso debe ser mayor a 0'
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            showToast('Revisa los campos marcados en rojo', 'error')
            return
        }

        setIsSaving(true)
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()
            if (!data.error) {
                setIsNewOrderModalOpen(false)
                setFormData({
                    customerName: '',
                    customerPhone: '',
                    priority: 'NORMAL',
                    totalPrice: '',
                    projectName: '',
                    materialId: materials.length > 0 ? materials[0].id : '',
                    weightGrams: ''
                })
                setFormErrors({})
                fetchOrders()
                showToast('Orden creada exitosamente', 'success')
            } else {
                showToast(data.error || 'Error al crear la orden', 'error')
            }
        } catch (err) {
            console.error('Error creating order:', err)
            showToast('Error de conexión', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleExport = useCallback((format: 'csv') => {
        if (filteredOrders.length === 0) {
            showToast('No hay datos para exportar', 'info')
            return
        }
        const exportData = filteredOrders.map(o => ({
            ID: o.id,
            Cliente: o.customerName,
            Telefono: o.customerPhone || '',
            Prioridad: o.priority,
            Estado: o.status,
            'Total (ARS)': o.totalPrice,
            Proyecto: o.items?.[0]?.projectName || '',
            'Fecha Creacion': new Date(o.createdAt).toLocaleDateString('es-AR'),
            'Items': o.items?.length || 0
        }))
        exportToCSV(exportData, `printhype_orders_${format}`)
        setShowExportMenu(false)
        showToast(`Exportado a ${format.toUpperCase()}`, 'success')
    }, [filteredOrders, showToast])

    const { data: paginatedOrders, pagination } = useMemo(() => {
        return paginate(filteredOrders, currentPage, ITEMS_PER_PAGE)
    }, [filteredOrders, currentPage])

    const stats = [
        { label: 'Pendientes', count: orders.filter(o => o.status === 'PENDING').length, color: 'text-yellow-500' },
        { label: 'En Imprenta', count: orders.filter(o => o.status === 'PRINTING').length, color: 'text-brand-orange' },
        { label: 'Para Enviar', count: orders.filter(o => o.status === 'SHIPPED').length, color: 'text-brand-cyan' },
        { label: 'Completados', count: orders.filter(o => o.status === 'COMPLETED').length, color: 'text-green-500' },
    ]

    const statusColors = {
        PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        PRINTING: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
        SHIPPED: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/20',
    }

    const priorityColors = {
        NORMAL: 'bg-neutral-800 text-neutral-400 border-neutral-700',
        HIGH: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
        URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
    }

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'PENDING': return <Clock size={12} />
            case 'PRINTING': return <Activity size={12} className="animate-pulse" />
            case 'SHIPPED': return <Truck size={12} />
            case 'COMPLETED': return <CheckCircle2 size={12} />
            default: return <AlertCircle size={12} />
        }
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase">{Dictionary.orders.title}</h1>
                    <p className="text-neutral-500 text-sm mt-1">{Dictionary.orders.subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all"
                        >
                            <Download size={14} /> EXPORTAR
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl z-50">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                                >
                                    <FileSpreadsheet size={14} /> Exportar a CSV
                                </button>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setIsNewOrderModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,102,0,0.3)]"
                    >
                        <Plus size={16} /> {Dictionary.orders.addBtn}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-neutral-950/40 border border-neutral-900 p-4 rounded-2xl flex items-center justify-between backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{stat.label}</span>
                        <span className={`text-xl font-black ${stat.color}`}>{stat.count}</span>
                    </div>
                ))}
            </div>

            <div className="flex gap-4">
                <div className="flex-1 relative group">
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, ID o proyecto..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="w-full bg-neutral-950/40 border border-neutral-900 rounded-xl px-4 py-2.5 pl-12 text-sm focus:outline-none focus:border-brand-orange/50 transition-all font-medium text-white"
                    />
                    <Search className="absolute left-4 top-3 text-neutral-600 group-focus-within:text-brand-orange transition-colors" size={16} />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold appearance-none focus:outline-none focus:border-brand-orange/50 text-neutral-400 cursor-pointer"
                    >
                        <option value="">Todos los estados</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="PRINTING">En Imprenta</option>
                        <option value="SHIPPED">Para Enviar</option>
                        <option value="COMPLETED">Completados</option>
                    </select>
                </div>
            </div>

            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl overflow-hidden backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-900 bg-white/5">
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">ID Orden</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Cliente</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Items</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Estado</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Total</th>
                            <th className="p-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                                    <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Sincronizando con la DB...</p>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center">
                                    <AlertCircle size={40} className="mx-auto text-red-500 mb-4 opacity-50" />
                                    <p className="text-sm font-black text-red-500 uppercase tracking-widest">{error}</p>
                                    <button 
                                        onClick={fetchOrders}
                                        className="mt-4 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-[10px] font-black hover:text-brand-orange transition-all"
                                    >
                                        REINTENTAR CONEXIÓN
                                    </button>
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center">
                                    <Package size={40} className="mx-auto text-neutral-800 mb-4" />
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                                        {searchQuery || statusFilter 
                                            ? 'No se encontraron órdenes con esos filtros' 
                                            : 'No hay órdenes registradas.'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            paginatedOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                    <td className="p-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-xs font-bold text-brand-orange uppercase">{order.id.slice(0, 8)}...</span>
                                            <div className={cn(
                                                "w-fit px-1.5 py-0.5 rounded text-[8px] font-black tracking-tighter border",
                                                priorityColors[order.priority as keyof typeof priorityColors] || priorityColors.NORMAL
                                            )}>
                                                {order.priority}
                                            </div>
                                        </div>
                                        <div className="text-[9px] text-neutral-600 mt-1 font-bold">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                                                <User size={14} className="text-neutral-500" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm tracking-tight text-white block">{order.customerName}</span>
                                                {order.customerPhone ? (
                                                    <a 
                                                        href={getWaUrl(order.customerPhone, order.customerName, order.items?.[0]?.projectName || 'PrintHype')} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] text-green-500 font-bold uppercase tracking-tighter hover:text-green-400 hover:underline inline-flex items-center gap-1 transition-all"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                                        {order.customerPhone}
                                                    </a>
                                                ) : (
                                                    <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-tighter">Sin Celular</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-neutral-800 rounded-md text-neutral-300">
                                                {order.items?.length || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border",
                                            statusColors[order.status as keyof typeof statusColors]
                                        )}>
                                            <StatusIcon status={order.status} />
                                            {order.status}
                                        </div>
                                    </td>
                                    <td className="p-5 font-black text-white text-sm">
                                        {formatCurrency(order.totalPrice)}
                                    </td>
                                    <td className="p-5 text-right">
                                        <Link 
                                            href={`/dashboard/orders/${order.id}`}
                                            className="text-[10px] font-black text-brand-orange hover:text-white transition-all flex items-center justify-end gap-1"
                                        >
                                            VER <ChevronRight size={10} />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {!isLoading && !error && filteredOrders.length > 0 && (
                    <div className="px-6 py-4 border-t border-neutral-900 flex items-center justify-between">
                        <span className="text-xs text-neutral-500">
                            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-bold px-3">
                                {currentPage} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={currentPage >= pagination.totalPages}
                                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Modal 
                isOpen={isNewOrderModalOpen} 
                onClose={() => {
                    setIsNewOrderModalOpen(false)
                    setFormErrors({})
                }}
                title="Nueva Orden de Producción"
            >
                <form className="space-y-6" onSubmit={handleCreateOrder}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Cliente *</label>
                            <input 
                                type="text" 
                                value={formData.customerName}
                                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                                placeholder="Ej: Migue Baena" 
                                className={cn(
                                    "w-full bg-neutral-900 border rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white",
                                    formErrors.customerName ? "border-red-500" : "border-neutral-800"
                                )}
                            />
                            {formErrors.customerName && (
                                <p className="text-[10px] text-red-500">{formErrors.customerName}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Teléfono (WhatsApp)</label>
                            <input 
                                type="text"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                                placeholder="Ej: +54 9 11..." 
                                className={cn(
                                    "w-full bg-neutral-900 border rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white",
                                    formErrors.customerPhone ? "border-red-500" : "border-neutral-800"
                                )}
                            />
                            {formErrors.customerPhone && (
                                <p className="text-[10px] text-red-500">{formErrors.customerPhone}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Prioridad</label>
                            <select 
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white appearance-none"
                            >
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">Alta</option>
                                <option value="URGENT">Urgente</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Presupuesto ($) *</label>
                            <input 
                                type="number" 
                                value={formData.totalPrice}
                                onChange={(e) => setFormData({...formData, totalPrice: e.target.value})}
                                placeholder="Ej: 4500" 
                                className={cn(
                                    "w-full bg-neutral-900 border rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white",
                                    formErrors.totalPrice ? "border-red-500" : "border-neutral-800"
                                )}
                            />
                            {formErrors.totalPrice && (
                                <p className="text-[10px] text-red-500">{formErrors.totalPrice}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase">Nombre del Proyecto *</label>
                        <input 
                            type="text" 
                            value={formData.projectName}
                            onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                            placeholder="..." 
                            className={cn(
                                "w-full bg-neutral-900 border rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white",
                                formErrors.projectName ? "border-red-500" : "border-neutral-800"
                            )}
                        />
                        {formErrors.projectName && (
                            <p className="text-[10px] text-red-500">{formErrors.projectName}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Material *</label>
                            <select 
                                value={formData.materialId}
                                onChange={(e) => setFormData({...formData, materialId: e.target.value})}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white appearance-none"
                            >
                                {materials.length === 0 ? (
                                    <option value="">Cargando...</option>
                                ) : (
                                    materials.map(mat => (
                                        <option key={mat.id} value={mat.id}>
                                            {mat.name} ({mat.color})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Peso (gramos) *</label>
                            <input 
                                type="number" 
                                value={formData.weightGrams}
                                onChange={(e) => setFormData({...formData, weightGrams: e.target.value})}
                                placeholder="Ej: 50" 
                                className={cn(
                                    "w-full bg-neutral-900 border rounded-xl px-4 py-3 text-sm focus:border-brand-orange transition-all outline-none text-white",
                                    formErrors.weightGrams ? "border-red-500" : "border-neutral-800"
                                )}
                            />
                            {formErrors.weightGrams && (
                                <p className="text-[10px] text-red-500">{formErrors.weightGrams}</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={() => {
                                setIsNewOrderModalOpen(false)
                                setFormErrors({})
                            }}
                            disabled={isSaving}
                            className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all text-neutral-400 disabled:opacity-50"
                        >
                            CANCELAR
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-[0_0_20px_rgba(255,102,0,0.2)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            {isSaving ? (
                                <><div className="h-4 w-4 border-2 border-black/20 border-b-black rounded-full animate-spin"></div> GUARDANDO...</>
                            ) : 'CREAR ORDEN'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}

export default function OrdersWithProvider() {
    return (
        <ToastProvider>
            <OrdersPage />
        </ToastProvider>
    )
}