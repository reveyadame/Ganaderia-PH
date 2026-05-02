'use client'

import { useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error'

interface Toast {
  id: string
  type: ToastType
  message: string
}

let toastCallback: ((type: ToastType, message: string) => void) | null = null

export function toast(type: ToastType, message: string) {
  toastCallback?.(type, message)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  toastCallback = addToast

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl shadow-lg pointer-events-auto',
            'slide-up text-sm min-w-[280px] max-w-md bg-surface-raised border',
            t.type === 'success' ? 'border-success/30' : 'border-danger/30',
          )}
        >
          {t.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            : <AlertCircle  className="h-4 w-4 text-danger  shrink-0 mt-0.5" />
          }
          <span className="flex-1 text-foreground leading-snug">{t.message}</span>
          <button
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            aria-label="Cerrar notificación"
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
