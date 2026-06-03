'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Content */}
            <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90dvh] sm:max-h-[95vh] mx-auto">
                {/* iOS-style drag handle */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-0 absolute top-0 left-0 right-0 z-10 pointer-events-none">
                    <div className="w-10 h-1 rounded-full bg-neutral-700"></div>
                </div>
                <div className="flex items-center justify-between p-6 border-b border-neutral-900 bg-white/5">
                    <h3 className="text-xl font-black tracking-tight text-white uppercase">{title}</h3>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar modal"
                        className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    )
}
