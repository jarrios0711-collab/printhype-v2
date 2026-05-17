'use client'

import React, { useState, useEffect } from 'react'
import {
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
    Clock,
    Cpu,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Tooltip from '@/components/ui/Tooltip'

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini', defaultUrl: 'https://api.openai.com/v1' },
  { value: 'groq', label: 'Groq (gratis rápido)', defaultModel: 'llama-3.3-70b-versatile', defaultUrl: 'https://api.groq.com/openai/v1' },
  { value: 'gemini', label: 'Gemini (Google)', defaultModel: 'gemini-2.0-flash', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'ollama', label: 'Ollama (local)', defaultModel: 'gemma3:4b', defaultUrl: 'http://localhost:11434' },
  { value: 'openrouter', label: 'OpenRouter', defaultModel: 'google/gemini-2.0-flash-001', defaultUrl: 'https://openrouter.ai/api/v1' },
]

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
                <Tooltip content="Guardar configuración general">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-black rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-orange/20 disabled:opacity-50 tap-target"
                    >
                        {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                    </button>
                </Tooltip>
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
    const [profiles, setProfiles] = useState<any[]>([])
    const [newPrinterName, setNewPrinterName] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [showAddProfile, setShowAddProfile] = useState(false)
    const [newProfile, setNewProfile] = useState({
        name: '', type: 'PLA', nozzleTemp: 210, bedTemp: 60, brand: '', color: '#FF6600'
    })

    const fetchData = async () => {
        setIsLoading(true)
        const [pRes, pfRes] = await Promise.all([
            fetch('/api/printers'),
            fetch('/api/filament-profiles')
        ])
        const pData = await pRes.json()
        const pfData = await pfRes.json()
        if (!pData.error) setPrinters(pData)
        if (!pfData.error) setProfiles(pfData)
        setIsLoading(false)
    }

    useEffect(() => { fetchData() }, [])

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

    const handleAddProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        const res = await fetch('/api/filament-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProfile)
        })
        const data = await res.json()
        if (data && !data.error) {
            setProfiles([...profiles, data])
            setNewProfile({ name: '', type: 'PLA', nozzleTemp: 210, bedTemp: 60, brand: '', color: '#FF6600' })
            setShowAddProfile(false)
        }
    }

    const handleDeleteProfile = async (id: string) => {
        const res = await fetch(`/api/filament-profiles?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
            setProfiles(profiles.filter(p => p.id !== id))
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Printers Section */}
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
                        <Tooltip content="Agregar impresora">
                            <button onClick={handleAddPrinter} className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-brand-orange hover:text-white transition-all border border-neutral-800 tap-target">
                                <Plus size={16} />
                            </button>
                        </Tooltip>
                    </div>
                </div>
                {isLoading ? <span className="text-neutral-500 text-xs">Cargando...</span> : printers.map((printer) => (
                    <div key={printer.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-sm font-bold text-neutral-200">{printer.name}</span>
                        </div>
                        <button onClick={() => handleDeletePrinter(printer.id)} className="text-neutral-600 hover:text-red-500 transition-colors tap-target">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </section>

            {/* Filament Profiles Section */}
            <section className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Zap size={16} className="text-brand-orange" /> Perfiles de Filamento
                    </h3>
                    <button
                        onClick={() => setShowAddProfile(!showAddProfile)}
                        className="p-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {showAddProfile && (
                    <form onSubmit={handleAddProfile} className="p-4 bg-black/40 rounded-2xl border border-brand-orange/30 space-y-3">
                        <input
                            type="text" required value={newProfile.name}
                            onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                            placeholder="Nombre del perfil"
                            className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-sm text-white outline-none focus:border-brand-orange"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newProfile.type} onChange={e => setNewProfile({...newProfile, type: e.target.value})}
                                className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-sm text-white outline-none">
                                <option value="PLA">PLA</option>
                                <option value="PETG">PETG</option>
                                <option value="TPU">TPU</option>
                                <option value="ABS / ASA">ABS / ASA</option>
                                <option value="Resina UV">Resina UV</option>
                            </select>
                            <input type="color" value={newProfile.color}
                                onChange={e => setNewProfile({...newProfile, color: e.target.value})}
                                className="h-10 bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-neutral-500 uppercase">Nozzle °C</label>
                                <input type="number" value={newProfile.nozzleTemp}
                                    onChange={e => setNewProfile({...newProfile, nozzleTemp: parseInt(e.target.value)})}
                                    className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-sm text-white outline-none" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-neutral-500 uppercase">Cama °C</label>
                                <input type="number" value={newProfile.bedTemp}
                                    onChange={e => setNewProfile({...newProfile, bedTemp: parseInt(e.target.value)})}
                                    className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded-lg text-sm text-white outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button type="submit" className="flex-1 py-2 bg-brand-orange text-black font-black text-xs rounded-lg hover:scale-[1.02] transition-all">
                                GUARDAR PERFIL
                            </button>
                            <button type="button" onClick={() => setShowAddProfile(false)}
                                className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:text-white transition-all">
                                CANCELAR
                            </button>
                        </div>
                    </form>
                )}

                {isLoading ? (
                    <span className="text-neutral-500 text-xs">Cargando...</span>
                ) : profiles.length === 0 ? (
                    <p className="text-neutral-600 text-xs text-center py-8">Sin perfiles aún. Agregá uno.</p>
                ) : profiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded border border-neutral-700" style={{ backgroundColor: profile.color }}></div>
                            <div>
                                <span className="text-sm font-bold text-neutral-200">{profile.name}</span>
                                <span className="text-[10px] text-neutral-500 block font-mono">{profile.nozzle_temp}°C/{profile.bed_temp}°C</span>
                            </div>
                        </div>
                        <button onClick={() => handleDeleteProfile(profile.id)} className="text-neutral-600 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                        </button>
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
    const [aiConfig, setAiConfig] = useState<any>({ provider: 'ollama', apiKey: '', model: 'gemma3:4b', baseUrl: 'http://localhost:11434' })
    const [aiSaving, setAiSaving] = useState(false)
    const [aiSaved, setAiSaved] = useState(false)

    useEffect(() => {
        fetch('/api/user/ai-config').then(r => r.json()).then(data => {
            if (!data.error) setAiConfig(data)
        }).catch(() => {})
    }, [])

    const providerMeta = AI_PROVIDERS.find(p => p.value === aiConfig.provider) || AI_PROVIDERS[3]

    const handleSaveAi = async () => {
        setAiSaving(true)
        try {
            const res = await fetch('/api/user/ai-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: aiConfig.provider,
                    api_key: aiConfig.apiKey,
                    model: aiConfig.model,
                    base_url: aiConfig.baseUrl,
                })
            })
            const data = await res.json()
            if (!data.error) {
                setAiSaved(true)
                setTimeout(() => setAiSaved(false), 3000)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setAiSaving(false)
        }
    }

    const hasApiKey = aiConfig.provider === 'ollama' || (aiConfig.apiKey && aiConfig.apiKey.length > 5)

    if (!settings) return null;

    return (
        <div className="space-y-6">
            {/* AI Provider Config */}
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange border border-brand-orange/20">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Proveedor de IA</h3>
                            <p className="text-xs text-neutral-500">Cada usuario configura su propio motor de IA.</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border ${
                        hasApiKey
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                        {hasApiKey ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {hasApiKey ? 'CONFIGURADO' : 'PENDIENTE'}
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Proveedor</label>
                        <select
                            value={aiConfig.provider}
                            onChange={e => {
                                const p = AI_PROVIDERS.find(x => x.value === e.target.value) || AI_PROVIDERS[3]
                                setAiConfig({ ...aiConfig, provider: e.target.value, model: p.defaultModel, baseUrl: p.defaultUrl })
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange appearance-none"
                        >
                            {AI_PROVIDERS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Modelo</label>
                        <input
                            type="text"
                            value={aiConfig.model}
                            onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                            placeholder={providerMeta.defaultModel}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange"
                        />
                    </div>
                </div>

                {aiConfig.provider !== 'ollama' && (
                    <div className="mt-4 space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">API Key</label>
                        <input
                            type="password"
                            value={aiConfig.apiKey}
                            onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                            placeholder="sk-... o tu API key"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange font-mono"
                        />
                        <p className="text-[9px] text-neutral-600">Tu API key se guarda encriptada y solo la usa tu cuenta.</p>
                    </div>
                )}

                <div className="mt-4">
                    <button
                        onClick={handleSaveAi}
                        disabled={aiSaving}
                        className="px-6 py-2.5 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-lg shadow-brand-orange/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {aiSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                        {aiSaved ? 'GUARDADO ✓' : 'GUARDAR CONFIGURACIÓN IA'}
                    </button>
                </div>
            </div>

            {/* Webhook Config (global) */}
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
