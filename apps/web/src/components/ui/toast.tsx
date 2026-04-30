'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
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
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto',
            'animate-in slide-up text-sm font-medium min-w-[260px] max-w-sm',
            t.type === 'success'
              ? 'bg-surface border-green-500/30 text-foreground'
              : 'bg-surface border-red-500/30 text-foreground',
          )}
        >
          {t.type === 'success'
            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            : <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
