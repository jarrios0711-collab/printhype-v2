'use client'

import { useState, useEffect } from 'react'
import { 
    Layers, 
    Plus, 
    MoreHorizontal, 
    Filter,
    Download,
    Scale,
    Tag,
    DollarSign,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { Dictionary } from '@/config/dictionary'

import Tooltip from '@/components/ui/Tooltip'

export default function InventoryPage() {
    const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false)
    const [materials, setMaterials] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        type: 'PLA',
        initialWeight: '1000',
        pricePerKg: '',
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

    useEffect(() => {
        fetchInventory()
    }, [])

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            } else {
                alert(data.error)
            }
        } catch (err) {
            console.error('Error adding material:', err)
        } finally {
            setIsSaving(false)
        }
    }

    // Calculations
    const getMaterialStock = (material: any) => {
        return material.stocks?.reduce((acc: number, s: any) => acc + s.weightGrams, 0) || 0
    }

    const totalInventoryValue = materials.reduce((acc, m) => {
        const stockKg = getMaterialStock(m) / 1000
        return acc + (stockKg * m.pricePerKg)
    }, 0)

    const lowStockAlerts = materials.filter(m => getMaterialStock(m) < 200).length

    return (
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
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

            {/* Filters Bar */}
            <div className="flex bg-neutral-950/40 border border-neutral-900 p-1.5 sm:p-2 rounded-2xl backdrop-blur-md overflow-x-auto">
                <div className="flex gap-1">
                    {['Todos', ...Dictionary.inventory.categories].map((filter, i) => (
                        <button key={i} className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap tap-target ${i === 0 ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}>
                            {filter}
                        </button>
                    ))}
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-4 px-4 border-l border-neutral-800">
                    <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold">
                        <Filter size={14} /> Filtros Avanzados
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl overflow-hidden backdrop-blur-md">
                <table className="w-full text-left border-collapse responsive-table">
                    <thead>
                        <tr className="border-b border-neutral-900 bg-white/5">
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">{Dictionary.inventory.itemLabel}</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">{Dictionary.inventory.categoryLabel}</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Stock Actual</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">{Dictionary.inventory.metricPrice}</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-neutral-500">Estado</th>
                            <th className="p-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                         {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                                    <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-widest text">Analizando Stocks...</p>
                                </td>
                            </tr>
                        ) : materials.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center text-neutral-500">
                                    No hay materiales registrados. Comienza agregando uno.
                                </td>
                            </tr>
                        ) : (
                            materials.map((item) => {
                                const currentStock = getMaterialStock(item)
                                const isLow = currentStock < 200
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5" data-label="Material">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg border border-neutral-800 flex items-center justify-center p-1.5 shrink-0" style={{ backgroundColor: `${item.color}20` }}>
                                                    <div className="w-full h-full rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ backgroundColor: item.color }}></div>
                                                </div>
                                                <span className="font-bold text-sm text-white">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5" data-label="Tipo">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-neutral-200">{item.type}</span>
                                                <span className="text-[10px] text-neutral-500 font-mono uppercase font-bold">{item.brand}</span>
                                            </div>
                                        </td>
                                        <td className="p-5" data-label="Stock">
                                            <div className="flex flex-col gap-1 w-full sm:w-32">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-white">{currentStock.toFixed(0)}g</span>
                                                    <span className="text-neutral-500">1000g</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${isLow ? 'bg-brand-orange shadow-[0_0_10px_rgba(255,102,0,0.5)]' : 'bg-brand-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]'}`}
                                                        style={{ width: `${Math.min((currentStock / 1000) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-sm font-black text-green-500" data-label="Precio/Kg">
                                            ${item.pricePerKg.toFixed(2)}
                                        </td>
                                        <td className="p-5" data-label="Estado">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                                                isLow ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                                            }`}>
                                                {isLow ? 'LOW STOCK' : 'IN STOCK'}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right" data-label="">
                                            <button className="p-2 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded-lg transition-all tap-target">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-brand-orange/5 border border-brand-orange/20 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">Valor Total Inventario</div>
                    <div className="text-2xl font-black text-white">${totalInventoryValue.toFixed(2)}</div>
                </div>
                <div className="p-6 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-1">Alertas de Reposición</div>
                    <div className="text-2xl font-black text-white">{lowStockAlerts} Materiales</div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Color más usado</div>
                    <div className="text-2xl font-black text-white uppercase tracking-tighter">PLA Black</div>
                </div>
            </div>

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
                        <button 
                            type="button"
                            onClick={() => setIsAddMaterialModalOpen(false)}
                            disabled={isSaving}
                            className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all text-neutral-400 disabled:opacity-50"
                        >
                            DESCARTAR
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-3 bg-brand-cyan text-black font-black text-xs rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'SINCRONIZAR STOCK'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
