'use client'

import { useState, useEffect } from 'react'
import {
    Video,
    TrendingUp,
    Play,
    Share2,
    Zap,
    ExternalLink,
    Clock,
    Flame,
    Plus,
    Loader2,
    AlertCircle
} from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

export default function ViralPage() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState({ title: '', platform: 'Instagram', contentIdea: '' })

    const fetchCampaigns = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/viral')
            const data = await res.json()
            if (!data.error) setCampaigns(data)
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchCampaigns() }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const res = await fetch('/api/viral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!data.error) {
                setCampaigns([data, ...campaigns])
                setShowModal(false)
                setForm({ title: '', platform: 'Instagram', contentIdea: '' })
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    const platformIcons: Record<string, string> = {
        Instagram: '📷', TikTok: '🎵', YouTube: '▶️', Twitter: '🐦', LinkedIn: '💼',
    }

    return (
        <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Viral Cockpit</h1>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1">Control de contenido viral y automatización de marketing.</p>
                </div>
                <Tooltip content="Crear nueva campaña de contenido">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-lg shadow-brand-orange/20 w-full sm:w-auto justify-center tap-target"
                    >
                        <Zap size={16} /> NUEVA CAMPAÑA
                    </button>
                </Tooltip>
            </div>

            {/* Trends Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-8 bg-neutral-950/40 border border-neutral-900 rounded-3xl backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-brand-orange/10 group-hover:text-brand-orange/20 transition-all">
                        <TrendingUp size={80} />
                    </div>
                    <div className="flex items-center gap-2 text-brand-orange text-[10px] font-black uppercase tracking-widest mb-4">
                        <Flame size={14} className="animate-pulse" /> Trending Argentina
                    </div>
                    <h3 className="text-2xl font-black mb-2">#Copa2026</h3>
                    <p className="text-neutral-500 text-xs">Crecimiento orgánico sugerido para productos de colección.</p>
                </div>

                <div className="p-8 bg-neutral-950/40 border border-neutral-900 rounded-3xl backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-center gap-2 text-brand-cyan text-[10px] font-black uppercase tracking-widest mb-4">
                        <Clock size={14} /> Mejor Horario
                    </div>
                    <h3 className="text-2xl font-black mb-2">19:45 ART</h3>
                    <p className="text-neutral-500 text-xs">Pico de audiencia detectado en flujos de n8n.</p>
                </div>

                <div className="p-8 bg-neutral-950/40 border border-neutral-900 rounded-3xl backdrop-blur-md relative overflow-hidden group">
                    <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest mb-4">
                        <Share2 size={14} /> Conversión
                    </div>
                    <h3 className="text-2xl font-black mb-2">4.2%</h3>
                    <p className="text-neutral-500 text-xs">Lead-to-Order desde WhatsApp bot.</p>
                </div>
            </div>

            {/* Content Queue */}
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-4 sm:p-8 backdrop-blur-md">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                    <Video className="text-brand-orange" size={20} />
                    Campañas de Contenido
                </h2>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-brand-orange" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-16">
                        <Video size={40} className="mx-auto text-neutral-800 mb-4" />
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Sin campañas aún. Creá la primera.</p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {campaigns.map((camp) => (
                            <div key={camp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all group gap-3">
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-neutral-900 flex items-center justify-center relative overflow-hidden border border-neutral-800 shrink-0 text-2xl">
                                        {platformIcons[camp.platform] || '📱'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold truncate">{camp.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">{camp.id.slice(0, 8)}</span>
                                            <span className="text-[10px] text-neutral-400">•</span>
                                            <span className="text-[10px] text-neutral-400 font-bold">{camp.platform}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-12">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-neutral-600 uppercase mb-1">Impacto</div>
                                        <div className="text-base sm:text-lg font-black">{camp.views === '-' ? 'PEND' : camp.views}</div>
                                    </div>
                                    <div className="w-24 sm:w-32">
                                        <div className={cn(
                                            "text-center py-1.5 rounded-full text-[9px] font-black tracking-widest border",
                                            camp.status === 'LIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            camp.status === 'SCHEDULED' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' :
                                            'bg-neutral-800 text-neutral-400 border-neutral-700'
                                        )}>
                                            {camp.status}
                                        </div>
                                    </div>
                                    <button className="p-2 sm:p-3 bg-neutral-900 rounded-xl hover:bg-neutral-800 hover:text-brand-orange transition-all tap-target">
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Campaña">
                <form className="space-y-6" onSubmit={handleCreate}>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase">Título de la Campaña</label>
                        <input
                            type="text" required
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Ej: Mate Libertadores 2026"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange tap-target"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Plataforma</label>
                            <select
                                value={form.platform}
                                onChange={e => setForm({ ...form, platform: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none tap-target"
                            >
                                <option value="Instagram">📷 Instagram</option>
                                <option value="TikTok">🎵 TikTok</option>
                                <option value="YouTube">▶️ YouTube</option>
                                <option value="Twitter">🐦 Twitter</option>
                                <option value="LinkedIn">💼 LinkedIn</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Estado</label>
                            <select disabled
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-500 outline-none appearance-none tap-target"
                            >
                                <option>DRAFT</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-500 uppercase">Idea de Contenido (opcional)</label>
                        <textarea
                            value={form.contentIdea}
                            onChange={e => setForm({ ...form, contentIdea: e.target.value })}
                            placeholder="Describí brevemente de qué trata el contenido..."
                            rows={3}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            disabled={isSaving}
                            className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 hover:bg-neutral-800 transition-all tap-target"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 tap-target"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'CREAR CAMPAÑA'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
