'use client'

import React, { useState, useEffect } from 'react'
import { 
    Settings, 
    HardDrive, 
    Coins, 
    Globe, 
    Plus, 
    Trash2, 
    Save, 
    RefreshCcw,
    Zap,
    Printer,
    Database,
    MessageSquare,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'taller' | 'finanzas' | 'conectividad'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('taller')
    const [settings, setSettings] = useState<any>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => setSettings(data))
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            alert('Configuración Actualizada: Datos guardados en Supabase.')
        } catch (err) {
            console.error('Error saving settings:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const tabs = [
        { id: 'taller', label: 'Taller', icon: HardDrive },
        { id: 'finanzas', label: 'Finanzas', icon: Coins },
        { id: 'conectividad', label: 'IA & Conectividad', icon: Globe },
    ]

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Configuración</h1>
                    <p className="text-neutral-500 text-sm mt-1">Control maestro de parámetros y automatizaciones.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-black rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-orange/20 disabled:opacity-50"
                >
                    {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl w-full sm:w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                            activeTab === tab.id 
                                ? "bg-neutral-800 text-brand-orange shadow-lg" 
                                : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
                        )}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="space-y-6">
                {activeTab === 'taller' && <TallerSettings />}
                {activeTab === 'finanzas' && <FinanzasSettings settings={settings} setSettings={setSettings} />}
                {activeTab === 'conectividad' && <ConectividadSettings settings={settings} setSettings={setSettings} />}
            </div>
        </div>
    )
}

function TallerSettings() {
    const [printers, setPrinters] = useState<any[]>([])
    const [newPrinterName, setNewPrinterName] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch('/api/printers')
            .then(res => res.json())
            .then(data => {
                if(!data.error) setPrinters(data)
                setIsLoading(false)
            })
    }, [])

    const handleAddPrinter = async () => {
        if (!newPrinterName) return;
        const res = await fetch('/api/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newPrinterName })
        })
        const data = await res.json()
        if (data && !data.error) {
            setPrinters([...printers, data])
            setNewPrinterName('')
        }
    }

    const handleDeletePrinter = async (id: string) => {
        const res = await fetch(`/api/printers?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
            setPrinters(printers.filter(p => p.id !== id))
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col gap-4 mb-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Printer size={16} className="text-brand-orange" /> Granja de Impresoras
                    </h3>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newPrinterName}
                            onChange={e => setNewPrinterName(e.target.value)}
                            placeholder="Ej: Ender 3 v3" 
                            className="flex-1 bg-black/40 border border-neutral-800 p-2 rounded-lg text-sm text-white focus:border-brand-orange outline-none"
                        />
                        <button onClick={handleAddPrinter} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-brand-orange hover:text-white transition-all border border-neutral-800">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                {isLoading ? <span className="text-neutral-500 text-xs">Cargando...</span> : printers.map((printer, i) => (
                    <div key={printer.id || i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-sm font-bold text-neutral-200">{printer.name}</span>
                        </div>
                        <button onClick={() => handleDeletePrinter(printer.id)} className="text-neutral-600 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </section>

            <section className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Zap size={16} className="text-brand-orange" /> Perfiles de Filamento
                    </h3>
                    <button className="p-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all">
                        <Plus size={16} />
                    </button>
                </div>
                {['PLA Premium (210°C/60°C)', 'PETG Industrial (240°C/80°C)', 'TPU Flex (220°C/40°C)'].map((profile, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                        <span className="text-sm font-medium text-neutral-400">{profile}</span>
                        <Settings size={14} className="text-neutral-600" />
                    </div>
                ))}
            </section>
        </div>
    )
}

function FinanzasSettings({ settings, setSettings }: { settings: any, setSettings: any }) {
    if (!settings) return <div className="p-12 text-center text-neutral-500">Cargando parámetros...</div>

    return (
        <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">Moneda de Facturación</label>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setSettings({ ...settings, currency: 'ARS' })}
                            className={cn("flex-1 p-4 rounded-2xl font-bold transition-all", settings.currency === 'ARS' ? "bg-neutral-900 border-2 border-brand-orange text-white" : "bg-neutral-950 border border-neutral-800 text-neutral-500")}
                        >
                            Peso Argentino (ARS)
                        </button>
                        <button 
                            onClick={() => setSettings({ ...settings, currency: 'USD' })}
                            className={cn("flex-1 p-4 rounded-2xl font-bold transition-all", settings.currency === 'USD' ? "bg-neutral-900 border-2 border-brand-orange text-white" : "bg-neutral-950 border border-neutral-800 text-neutral-500")}
                        >
                            Dólar (USD)
                        </button>
                    </div>
                </div>
                <div className="space-y-4">
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">Margen de Ganancia Global</label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="range" 
                            className="flex-1 accent-brand-orange rounded-full h-1.5 bg-neutral-800" 
                            min="1.0" 
                            max="3.0" 
                            step="0.1" 
                            value={settings.profitMargin} 
                            onChange={(e) => setSettings({ ...settings, profitMargin: parseFloat(e.target.value) })}
                        />
                        <span className="text-lg font-black text-brand-orange">{(settings.profitMargin * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-neutral-900">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Costo Eléctrico (kWh)</label>
                    <input 
                        type="number" 
                        value={settings.kwhPrice} 
                        onChange={(e) => setSettings({ ...settings, kwhPrice: parseFloat(e.target.value) })}
                        className="w-full bg-black/40 border border-neutral-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-brand-orange" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Costo Hora Operario</label>
                    <input 
                        type="number" 
                        value={settings.laborHourPrice} 
                        onChange={(e) => setSettings({ ...settings, laborHourPrice: parseFloat(e.target.value) })}
                        className="w-full bg-black/40 border border-neutral-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-brand-orange" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Última Actualización</label>
                    <div className="w-full bg-black/10 border border-neutral-900 p-3 rounded-xl text-[10px] font-medium text-neutral-500 flex items-center gap-2">
                        <Clock size={12} /> {settings.updatedAt ? new Date(settings.updatedAt).toLocaleDateString() : 'Sin datos aún'}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ConectividadSettings({ settings, setSettings }: { settings: any, setSettings: any }) {
    if (!settings) return null;

    return (
        <div className="space-y-6">
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange border border-brand-orange/20">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">IA Local (Ollama)</h3>
                            <p className="text-xs text-neutral-500">Conexión con el nucleo de inteligencia.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/20">
                        <CheckCircle2 size={12} /> CONECTADO
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <input 
                        type="text" 
                        value={settings.ollamaUrl} 
                        onChange={e => setSettings({...settings, ollamaUrl: e.target.value})}
                        className="flex-1 bg-black/40 border border-neutral-800 p-3 rounded-xl text-xs font-mono text-neutral-400 outline-none focus:border-brand-orange" 
                    />
                </div>
            </div>

            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Webhook Integración (WhatsApp/n8n)</h3>
                            <p className="text-xs text-neutral-500">Automatización de eventos externos.</p>
                        </div>
                    </div>
                    {settings.webhookUrl ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/20">
                            <CheckCircle2 size={12} /> ACTIVO
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black border border-red-500/20">
                            <XCircle size={12} /> PENDIENTE
                        </div>
                    )}
                </div>
                <div className="mt-6">
                    <input 
                        type="text" 
                        value={settings.webhookUrl} 
                        onChange={e => setSettings({...settings, webhookUrl: e.target.value})}
                        placeholder="https://tu-n8n.com/webhook/..."
                        className="w-full bg-black/40 border border-neutral-800 p-3 rounded-xl text-xs font-mono text-neutral-400 outline-none focus:border-brand-orange" 
                    />
                </div>
            </div>
        </div>
    )
}
