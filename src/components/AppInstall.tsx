'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone, Monitor, ExternalLink } from 'lucide-react'

export default function AppInstall() {
  const [mode, setMode] = useState<'loading' | 'standalone' | 'pwa-supported' | 'unsupported'>('loading')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setMode('standalone')
      return
    }

    // Check if PWA is supported
    if (!('serviceWorker' in navigator)) {
      setMode('unsupported')
      return
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Only show button if the event fired — means the app is installable
      if (mode === 'loading') setMode('pwa-supported')
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)

    // If the event doesn't fire after 10s, the site isn't installable (already installed, or missing criteria)
    const timer = setTimeout(() => {
      setMode(prev => prev === 'loading' ? 'unsupported' : prev)
    }, 10000)

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      // iOS doesn't support beforeinstallprompt — always show instructions
      setMode('pwa-supported')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
      clearTimeout(timer)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setInstalling(false)
    setDeferredPrompt(null)
    if (result.outcome === 'accepted') setMode('standalone')
  }

  if (mode === 'loading') return null

  if (mode === 'standalone') {
    return (
      <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shrink-0">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">App Instalada</h3>
            <p className="text-xs text-neutral-500">PrintHype ya está en tu pantalla de inicio</p>
          </div>
        </div>
      </div>
    )
  }

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange border border-brand-orange/20 shrink-0">
            <Download size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm">Instalar PrintHype</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isIOS
                ? 'En Safari: tocá Compartir → Agregar a pantalla de inicio'
                : deferredPrompt
                  ? 'Agregá la app a tu pantalla de inicio para acceso rápido'
                  : 'Abrí el menú del navegador y buscá "Instalar app" o "Agregar a pantalla de inicio"'
              }
            </p>
            {!deferredPrompt && !isIOS && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[9px] bg-neutral-800 px-2 py-1 rounded text-neutral-400">Chrome: ⋮ → Instalar</span>
                <span className="text-[9px] bg-neutral-800 px-2 py-1 rounded text-neutral-400">Edge: ⋯ → Apps → Instalar</span>
                <span className="text-[9px] bg-neutral-800 px-2 py-1 rounded text-neutral-400">iOS: Compartir → Pantalla de inicio</span>
              </div>
            )}
          </div>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 px-4 py-2.5 bg-brand-orange text-black rounded-xl text-xs font-black hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {installing ? 'INSTALANDO...' : 'INSTALAR'}
          </button>
        )}
      </div>
    </div>
  )
}
