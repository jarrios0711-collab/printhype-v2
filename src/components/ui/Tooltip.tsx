'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type TooltipPos = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: TooltipPos
  delay?: number
  className?: string
}

export default function Tooltip({ content, children, position = 'top', delay = 400, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const posClasses: Record<TooltipPos, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses: Record<TooltipPos, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-neutral-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-neutral-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-neutral-800',
  }

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-[999] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
            'bg-neutral-800 text-neutral-200 rounded-lg shadow-xl border border-neutral-700',
            'animate-in fade-in zoom-in duration-150',
            posClasses[position],
            className
          )}
        >
          {content}
          <div className={cn('absolute', arrowClasses[position])} />
        </div>
      )}
    </div>
  )
}
