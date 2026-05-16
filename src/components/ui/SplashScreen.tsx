'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true)
    const [isMounted, setIsMounted] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        const hasShown = sessionStorage.getItem('ph_splash_shown')
        if (hasShown) {
            setIsVisible(false)
            return
        }

        const timer = setTimeout(() => {
            setIsVisible(false)
            sessionStorage.setItem('ph_splash_shown', 'true')
        }, 2500)

        return () => clearTimeout(timer)
    }, [])

    if (!isVisible || !isMounted || isDismissed) return null

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => {
                setIsDismissed(true)
                setIsVisible(false)
                sessionStorage.setItem('ph_splash_shown', 'true')
            }}
        >
            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-8 bg-brand-orange rounded-b-full shadow-[0_0_30px_rgba(255,102,0,0.8)] animate-nozzle-move">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-3 bg-white/50 blur-[1px]"></div>
                </div>

                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <path
                        d="M30 70 L30 30 L50 30 C60 30 60 50 50 50 L30 50 M70 30 L70 70 M60 50 L80 50"
                        fill="none"
                        stroke="#FF6600"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="300"
                        strokeDashoffset="300"
                        className="animate-print-path"
                    />
                </svg>

                <div className="absolute w-2 h-2 bg-brand-orange rounded-full blur-[2px] animate-follow-path"></div>
            </div>

            <div className="mt-8 text-center space-y-2 translate-y-10 animate-fade-up">
                <h1 className="text-2xl font-black tracking-[0.2em] text-white uppercase italic">
                    Print<span className="text-brand-orange">Hype</span>
                </h1>
                <div className="w-48 h-1 bg-neutral-900 mx-auto rounded-full overflow-hidden">
                    <div className="h-full bg-brand-orange animate-loading-bar"></div>
                </div>
                <p className="text-[10px] font-bold text-neutral-600 tracking-widest uppercase">
                    Iniciando Motores 3D...
                </p>
                <p className="text-[8px] text-neutral-700 mt-2 font-medium animate-pulse">
                    Tocá para saltar
                </p>
            </div>

            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>
    )
}
