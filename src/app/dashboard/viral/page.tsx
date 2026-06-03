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
    AlertCircle,
    Trash2,
    Check,
    Edit3
} from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

interface Campaign {
    id: string
    title: string
    platform: string
    status: string
    views: string
    reach: string
    contentIdea: string
    createdAt: string
}

const platformIcons: Record<string, string> = {
    Instagram: '📷',
    TikTok: '🎵',
    YouTube: '▶️',
    Twitter: '🐦',
    LinkedIn: '💼',
}

const platformColors: Record<string, string> = {
    Instagram: 'bg-gradient-to-br from-purple-600 to-pink-500',
    TikTok: 'bg-gradient-to-br from-cyan-400 to-purple-600',
    YouTube: 'bg-gradient-to-br from-red-600 to-red-800',
    Twitter: 'bg-gradient-to-br from-blue-500 to-blue-700',
    LinkedIn: 'bg-gradient-to-br from-blue-700 to-blue-900',
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    SCHEDULED: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
    LIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
}

export default function ViralPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedCamp, setSelectedCamp] = useState<Campaign | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ title: '', platform: 'Instagram', contentIdea: '' })
    const [editForm, setEditForm] = useState({ title: '', platform: 'Instagram', status: 'DRAFT' as string, contentIdea: '' })

    const fetchCampaigns = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/viral')
            const data = await res.json()
            if (data.error) {
                setError(data.error)
            } else {
                setCampaigns(data)
            }
        } catch (err) {
            setError('Error de conexión al cargar campañas')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchCampaigns() }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/viral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (data.error) {
                setError(data.error)
            } else {
                setCampaigns([data, ...campaigns])
                setShowCreateModal(false)
                setForm({ title: '', platform: 'Instagram', contentIdea: '' })
            }
        } catch (err) {
            setError('Error al crear campaña')
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    const openDetail = (camp: Campaign) => {
        setSelectedCamp(camp)
        setEditForm({
            title: camp.title,
            platform: camp.platform,
            status: camp.status,
            contentIdea: camp.contentIdea,
        })
        setError(null)
        setShowDetailModal(true)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCamp) return
        setIsSaving(true)
        setError(null)
        try {
            const res = await fetch(`/api/viral/${selectedCamp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            })
            const data = await res.json()
            if (data.error) {
                setError(data.error)
            } else {
                setCampaigns(prev =>
                    prev.map(c => c.id === selectedCamp.id ? data : c)
                )
                setSelectedCamp(data)
                setShowDetailModal(false)
                setSelectedCamp(null)
            }
        } catch (err) {
            setError('Error al actualizar campaña')
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedCamp) return
        setIsDeleting(true)
        setError(null)
        try {
            const res = await fetch(`/api/viral/${selectedCamp.id}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.error) {
                setError(data.error)
            } else {
                setCampaigns(prev => prev.filter(c => c.id !== selectedCamp.id))
                setShowDetailModal(false)
                setSelectedCamp(null)
            }
        } catch (err) {
            setError('Error al eliminar campaña')
            console.error(err)
        } finally {
            setIsDeleting(false)
        }
    }

    const quickStatusToggle = async (camp: Campaign, newStatus: string) => {
        try {
            const res = await fetch(`/api/viral/${camp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const data = await res.json()
            if (!data.error) {
                setCampaigns(prev =>
                    prev.map(c => c.id === camp.id ? data : c)
                )
            }
        } catch (err) {
            console.error(err)
        }
    }

    const nextStatus = (current: string): string => {
        const flow: Record<string, string> = {
            DRAFT: 'SCHEDULED',
            SCHEDULED: 'LIVE',
            LIVE: 'DRAFT',
        }
        return flow[current] || 'DRAFT'
    }

    return (
        <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Viral Cockpit</h1>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1">Control de contenido viral y automatización de marketing.</p>
                </div>
                <Tooltip content="Crear nueva campaña de contenido">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-lg shadow-brand-orange/20 w-full sm:w-auto justify-center tap-target"
                    >
                        <Zap size={16} /> NUEVA CAMPAÑA
                    </button>
                </Tooltip>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-400 font-bold">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                        ✕
                    </button>
                </div>
            )}

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
                            <div
                                key={camp.id}
                                onClick={() => openDetail(camp)}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-white/10 transition-all group gap-3 cursor-pointer active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4 sm:gap-6">
                                    {/* Platform icon */}
                                    <div className={cn(
                                        "w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 text-2xl",
                                        platformColors[camp.platform] || 'bg-neutral-900'
                                    )}>
                                        {platformIcons[camp.platform] || '📱'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold truncate">{camp.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">{camp.id.slice(0, 8)}</span>
                                            <span className="text-[10px] text-neutral-400">•</span>
                                            <span className="text-[10px] text-neutral-400 font-bold">{camp.platform}</span>
                                            {camp.contentIdea && (
                                                <>
                                                    <span className="text-[10px] text-neutral-400">•</span>
                                                    <span className="text-[10px] text-neutral-500 italic truncate max-w-[120px] sm:max-w-[200px]">"{camp.contentIdea}"</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-12">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-neutral-600 uppercase mb-1">Impacto</div>
                                        <div className="text-base sm:text-lg font-black">{camp.views === '-' ? 'PEND' : camp.views}</div>
                                    </div>

                                    {/* Quick status toggle */}
                                    <div className="w-24 sm:w-32">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                quickStatusToggle(camp, nextStatus(camp.status))
                                            }}
                                            className={cn(
                                                "w-full text-center py-1.5 rounded-full text-[9px] font-black tracking-widest border transition-all hover:scale-105",
                                                statusColors[camp.status]
                                            )}
                                            title={`Cambiar a ${nextStatus(camp.status)}`}
                                        >
                                            {camp.status === 'DRAFT' && '📝 DRAFT'}
                                            {camp.status === 'SCHEDULED' && '📅 SCHEDULED'}
                                            {camp.status === 'LIVE' && '🔴 LIVE'}
                                        </button>
                                    </div>

                                    {/* Detail button */}
                                    <Tooltip content="Editar campaña">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openDetail(camp)
                                            }}
                                            className="p-2 sm:p-3 bg-neutral-900 rounded-xl hover:bg-neutral-800 hover:text-brand-orange transition-all tap-target"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setError(null) }} title="Nueva Campaña">
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
                        <Tooltip content="Descartar y cerrar formulario">
                            <button
                                type="button"
                                onClick={() => { setShowCreateModal(false); setError(null) }}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 hover:bg-neutral-800 transition-all tap-target"
                            >
                                CANCELAR
                            </button>
                        </Tooltip>
                        <Tooltip content="Crear nueva campaña de contenido viral">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 tap-target"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'CREAR CAMPAÑA'}
                            </button>
                        </Tooltip>
                    </div>
                </form>
            </Modal>

            {/* DETAIL / EDIT MODAL */}
            <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedCamp(null); setError(null) }} title="Editar Campaña">
                {selectedCamp && (
                    <form className="space-y-6" onSubmit={handleUpdate}>
                        {/* Preview header */}
                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className={cn(
                                "w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0",
                                platformColors[selectedCamp.platform] || 'bg-neutral-900'
                            )}>
                                {platformIcons[selectedCamp.platform] || '📱'}
                            </div>
                            <div>
                                <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Campaña</p>
                                <p className="text-sm font-bold">{selectedCamp.title}</p>
                                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                    ID: {selectedCamp.id} • Creada: {new Date(selectedCamp.createdAt).toLocaleDateString('es-AR')}
                                </p>
                            </div>
                        </div>

                        {/* Editable fields */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Título</label>
                            <input
                                type="text" required
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange tap-target"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase">Plataforma</label>
                                <select
                                    value={editForm.platform}
                                    onChange={e => setEditForm({ ...editForm, platform: e.target.value })}
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
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    className={cn(
                                        "w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none appearance-none tap-target",
                                        editForm.status === 'LIVE' ? 'text-green-500' :
                                        editForm.status === 'SCHEDULED' ? 'text-brand-cyan' : 'text-neutral-400'
                                    )}
                                >
                                    <option value="DRAFT">📝 DRAFT</option>
                                    <option value="SCHEDULED">📅 SCHEDULED</option>
                                    <option value="LIVE">🔴 LIVE</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase">Idea de Contenido</label>
                            <textarea
                                value={editForm.contentIdea}
                                onChange={e => setEditForm({ ...editForm, contentIdea: e.target.value })}
                                placeholder="Describí brevemente de qué trata el contenido..."
                                rows={3}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange resize-none"
                            />
                        </div>

                        {/* Stats read-only */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Impacto (Vistas)</p>
                                <p className="text-lg font-black">{selectedCamp.views === '-' ? 'PEND' : selectedCamp.views}</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Alcance</p>
                                <p className="text-lg font-black">{selectedCamp.reach === '-' ? 'PEND' : selectedCamp.reach}</p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-2">
                            {/* Delete button */}
                            <Tooltip content="Eliminar esta campaña permanentemente">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting || isSaving}
                                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-all tap-target"
                                >
                                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                </button>
                            </Tooltip>

                            {/* Cancel */}
                            <Tooltip content="Cerrar sin guardar">
                                <button
                                    type="button"
                                    onClick={() => { setShowDetailModal(false); setSelectedCamp(null); setError(null) }}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 hover:bg-neutral-800 transition-all tap-target"
                                >
                                    CANCELAR
                                </button>
                            </Tooltip>

                            {/* Save */}
                            <Tooltip content="Guardar cambios de la campaña">
                                <button
                                    type="submit"
                                    disabled={isSaving || isDeleting}
                                    className="flex-1 py-3 bg-brand-orange text-black font-black text-xs rounded-xl shadow-lg shadow-brand-orange/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 tap-target"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> GUARDAR</>}
                                </button>
                            </Tooltip>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    )
}
