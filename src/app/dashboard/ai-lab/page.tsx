'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
    Cpu,
    Send,
    Sparkles,
    Terminal,
    Zap,
    RefreshCw,
    Play,
    Paperclip,
    FileCode,
    X,
    Loader2,
    Settings,
    AlertTriangle
} from 'lucide-react'
import { parseSTL, STLMetadata } from '@/lib/stl-utils'
import { cn } from '@/lib/utils'
import Tooltip from '@/components/ui/Tooltip'

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  groq: 'Groq',
  gemini: 'Gemini',
  ollama: 'Ollama (local)',
  openrouter: 'OpenRouter',
}

export default function AILabPage() {
    const [selectedTool, setSelectedTool] = useState(0)
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analyzedFile, setAnalyzedFile] = useState<STLMetadata | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [aiProvider, setAiProvider] = useState<string | null>(null)
    const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetch('/api/user/ai-config').then(r => r.json()).then(data => {
            if (!data.error) {
                setAiProvider(data.provider)
                setAiConfigured(data.provider !== 'ollama' ? !!data.apiKey : true)
            } else {
                setAiConfigured(false)
            }
        }).catch(() => setAiConfigured(false))
    }, [])

    const tools = [
        {
            id: 'cost-calc',
            title: 'Calculador de Costos',
            desc: 'Analiza geometría de STL y estima ROI',
            icon: Zap,
            context: 'Listo para calcular. Sube tu archivo STL y especifica el material para obtener un presupuesto detallado.'
        },
        {
            id: 'content-gen',
            title: 'Content Generator',
            desc: 'Crea guiones y copies para redes sociales',
            icon: Sparkles,
            context: 'Hola jarri, ¿qué pieza queremos viralizar hoy? Puedo escribirte guiones para Reels o descripciones para Instagram.'
        },
        {
            id: 'automation',
            title: 'Python Scripting',
            desc: 'Automatiza procesos del taller',
            icon: Terminal,
            context: 'Escribe lo que necesitas automatizar y te ayudaré con el código Python para tu flujo de n8n.'
        }
    ]

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsAnalyzing(true)
        try {
            const metadata = await parseSTL(file)
            setAnalyzedFile(metadata)

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Análisis completado para **${metadata.name}**. \n\nDimensiones detectadas: ${metadata.dimensions.x.toFixed(1)}x${metadata.dimensions.y.toFixed(1)}x${metadata.dimensions.z.toFixed(1)} mm. \nVolumen: ${metadata.volumeCm3.toFixed(2)} cm³. \n\n¿Querés que calculemos el costo de producción?`
            }])
        } catch (error) {
            console.error('Error analyzing STL:', error)
            alert('Error al analizar el archivo STL. Asegúrate de que sea un archivo válido.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleSendMessage = async () => {
        if (!input.trim() && !analyzedFile) return

        const userMessage = { role: 'user' as const, content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: input || "Analiza este archivo STL y genera un reporte de producción.",
                    context: tools[selectedTool].title,
                    fileData: analyzedFile
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || 'Error al conectar con la IA')
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ''

            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            while (true) {
                const { done, value } = await reader!.read()
                if (done) break

                const text = decoder.decode(value)
                assistantContent += text

                setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1].content = assistantContent
                    return newMessages
                })
            }
        } catch (error: any) {
            console.error('Chat Error:', error)
            setError(error.message || 'Error de conexión con la IA')
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickAction = (action: string) => {
        setInput(action)
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <input
                type="file"
                accept=".stl"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">AI LAB <span className="text-brand-orange">BETA</span></h1>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1">Laboratorio de inteligencia artificial para JR3D.</p>
                </div>
                <div className="flex items-center gap-3">
                    {aiProvider && (
                        <div className="px-3 py-1.5 bg-brand-orange/10 border border-brand-orange/20 rounded-full text-[10px] font-black text-brand-orange flex items-center gap-1.5">
                            <Cpu size={12} />
                            {PROVIDER_LABELS[aiProvider] || aiProvider}
                        </div>
                    )}
                    <Tooltip content="Configurar proveedor de IA en Ajustes">
                        <Link
                            href="/dashboard/settings"
                            className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                        >
                            <Settings size={16} />
                        </Link>
                    </Tooltip>
                </div>
            </div>

            {aiConfigured === false && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-yellow-500">IA no configurada</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                            Configurá tu proveedor de IA en{' '}
                            <Link href="/dashboard/settings" className="text-brand-orange underline">Ajustes → Conectividad</Link>
                            {' '}para usar el AI Lab. Si ya tenés Ollama corriendo local, debería funcionar automáticamente.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8 h-auto lg:h-[700px]">
                {/* Sidebar: AI Tools */}
                <div className="lg:col-span-1 flex lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-y-auto pr-0 lg:pr-2 pb-2 lg:pb-0 custom-scrollbar">
                    {tools.map((tool, i) => (
                        <Tooltip key={i} content={tool.desc} position="right">
                        <button
                            onClick={() => setSelectedTool(i)}
                            className={cn(
                                "text-left p-3 lg:p-4 rounded-2xl border transition-all duration-300 group shrink-0 w-48 lg:w-full",
                                selectedTool === i
                                    ? 'bg-brand-orange/10 border-brand-orange/40 shadow-[0_0_20px_rgba(255,102,0,0.1)]'
                                    : 'bg-neutral-950/40 border-neutral-900 hover:border-neutral-700'
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-lg inline-block mb-2 lg:mb-3 transition-colors",
                                selectedTool === i ? 'bg-brand-orange text-black' : 'bg-neutral-800 text-neutral-400 group-hover:text-white'
                            )}>
                                <tool.icon size={16} />
                            </div>
                            <h3 className={cn(
                                "text-xs lg:text-sm font-bold block transition-colors",
                                selectedTool === i ? 'text-brand-orange' : 'text-neutral-300'
                             )}>{tool.title}</h3>
                            <p className="hidden lg:block text-[10px] text-neutral-500 mt-1 leading-relaxed">{tool.desc}</p>
                        </button>
                        </Tooltip>
                    ))}
                </div>

                {/* Main: AI Chat / Execution Area */}
                <div className="lg:col-span-3 bg-neutral-950/40 border border-neutral-900 rounded-3xl flex flex-col backdrop-blur-xl overflow-hidden shadow-2xl relative">

                    {/* Lab Header */}
                    <div className="p-6 border-b border-neutral-900 flex justify-between items-center bg-white/[0.03]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center border border-neutral-800">
                                <Cpu className="text-brand-orange" size={20} />
                            </div>
                            <div>
                                <span className="font-bold text-sm tracking-tight text-white">Consola de IA</span>
                                <div className="text-[10px] text-neutral-500 flex items-center gap-1 font-bold">
                                    CONTEXTO: <span className="text-brand-orange uppercase">{tools[selectedTool].title}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Tooltip content="Limpiar historial de conversación">
                                <button
                                    onClick={() => setMessages([])}
                                    className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                        {/* Initial Message */}
                        <div className="flex gap-4">
                            <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,102,0,0.3)]">
                                <Cpu size={18} className="text-black" />
                            </div>
                            <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl rounded-tl-none max-w-[85%] backdrop-blur-md shadow-lg">
                                <p className="text-sm leading-relaxed text-neutral-200">
                                    {tools[selectedTool].context}
                                </p>
                            </div>
                        </div>

                        {/* Messages History */}
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex gap-4",
                                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                            )}>
                                <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                                    msg.role === 'user' ? 'bg-neutral-800' : 'bg-brand-orange shadow-[0_0_15px_rgba(255,102,0,0.3)]'
                                )}>
                                    {msg.role === 'user' ? <Paperclip size={18} className="text-neutral-400" /> : <Cpu size={18} className="text-black" />}
                                </div>
                                <div className={cn(
                                    "p-5 rounded-2xl max-w-[85%] backdrop-blur-md shadow-lg border",
                                    msg.role === 'user'
                                        ? 'bg-white/5 border-white/5 rounded-tr-none'
                                        : 'bg-neutral-900/80 border-neutral-800 rounded-tl-none'
                                )}>
                                    <p className="text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap">
                                        {msg.content}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <p className="text-xs font-bold text-red-500 flex items-center gap-2">
                                    <AlertTriangle size={14} /> ERROR
                                </p>
                                <p className="text-[11px] text-red-400/80 mt-1">{error}</p>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-black/60 border-t border-neutral-900 backdrop-blur-md">
                        {analyzedFile && (
                            <div className="mb-4 flex items-center justify-between p-3 bg-brand-orange/10 border border-brand-orange/30 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-orange/20 rounded-lg text-brand-orange">
                                        <FileCode size={20} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-white block uppercase tracking-widest">{analyzedFile.name}</span>
                                        <span className="text-[10px] text-neutral-500 font-bold uppercase">
                                            {analyzedFile.dimensions.x.toFixed(0)}x{analyzedFile.dimensions.y.toFixed(0)}x{analyzedFile.dimensions.z.toFixed(0)}mm • {analyzedFile.volumeCm3.toFixed(1)}cm³
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAnalyzedFile(null)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-neutral-500"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <div className="relative group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading || isAnalyzing}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage()
                                    }
                                }}
                                placeholder={isAnalyzing ? "Analizando geometría..." : "Escribe tu comando o consulta para la IA..."}
                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-6 py-4 pr-32 text-sm focus:outline-none focus:border-brand-orange/50 transition-all resize-none h-28 text-white placeholder-neutral-600 custom-scrollbar shadow-inner disabled:opacity-50"
                            />
                            <div className="absolute right-4 bottom-4 flex gap-2">
                                <Tooltip content="Subir archivo STL para análisis técnico">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading || isAnalyzing}
                                        className="w-10 h-10 bg-neutral-800 border border-neutral-700 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-500 transition-all disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                                    </button>
                                </Tooltip>
                                <Tooltip content="Enviar mensaje a la IA">
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isLoading || isAnalyzing}
                                        className="px-5 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-black font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-orange/30 disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>ENVIAR <Send size={14} className="ml-2" /></>}
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Lab Services */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                {[
                    { title: 'VIRAL CHECK', sub: 'Guion para Reels', action: 'Generame un guion para un Reel de Instagram que sea viral para esta pieza. Enfocate en el proceso de impresión.', icon: Sparkles, color: 'text-brand-orange' },
                    { title: 'COSTO TOTAL', sub: 'Reporte de ROI', action: 'Calculame el costo total de producción incluyendo electricidad y margen de ganancia para este STL.', icon: Zap, color: 'text-brand-cyan' },
                    { title: 'GEOMETRY FIX', sub: 'Optimización STL', action: 'Analiza si hay errores en la malla de este archivo y sugerime mejoras de orientación.', icon: Play, color: 'text-green-500' },
                    { title: 'TAG GENERATOR', sub: 'Hashtags & SEO', action: 'Generame una lista de 20 hashtags y un copy SEO para vender esta pieza en Mercado Libre.', icon: Cpu, color: 'text-purple-500' },
                ].map((card, i) => (
                    <Tooltip key={i} content={`${card.title}: ${card.sub}`}>
                    <button
                        onClick={() => handleQuickAction(card.action)}
                        className="p-4 bg-neutral-900/30 border border-neutral-800 rounded-2xl text-left hover:border-brand-orange/50 transition-all hover:bg-brand-orange/5 group"
                    >
                        <div className={cn("p-2 rounded-lg bg-neutral-800 w-fit mb-3 group-hover:bg-brand-orange group-hover:text-black transition-all", card.color.replace('text', 'bg-opacity-10 text'))}>
                            <card.icon size={16} />
                        </div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{card.title}</h4>
                        <p className="text-[11px] text-neutral-500 font-bold uppercase">{card.sub}</p>
                    </button>
                    </Tooltip>
                ))}
            </div>
        </div>
    )
}
