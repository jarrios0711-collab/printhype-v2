'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Only show if the browser supports SW (PWA-capable)
    if (!('serviceWorker' in navigator)) return

    // Register SW
    navigator.serviceWorker.register('/sw.js').catch(() => {})

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    window.addEventListener('appinstalled', () => setShow(false))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 sm:max-w-sm">
      <div className="bg-neutral-900 border border-brand-orange/30 rounded-2xl p-4 shadow-2xl shadow-brand-orange/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center shrink-0">
              <span className="text-black font-black text-lg">P</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">Instalar PrintHype</p>
              <p className="text-[10px] text-neutral-400">Agregá la app a tu pantalla de inicio</p>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="p-1 text-neutral-500 hover:text-white shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="mt-3 w-full py-2.5 bg-brand-orange text-black font-black text-xs rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <Download size={14} /> INSTALAR APLICACIÓN
        </button>
      </div>
    </div>
  )
}
