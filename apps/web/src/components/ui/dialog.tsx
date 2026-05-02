'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Dialog({ open, onClose, title, description, children, size = 'md' }: DialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] animate-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-surface-raised border border-border rounded-xl shadow-xl',
          'slide-up',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="-m-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  loading?: boolean
  confirmLabel?: string
  variant?: 'danger' | 'warning'
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, loading, confirmLabel = 'Confirmar', variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="h-9 px-4 rounded-md border border-border bg-surface text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'h-9 px-4 rounded-md text-sm text-white font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs',
            variant === 'danger' ? 'bg-danger hover:bg-danger/90' : 'bg-warning hover:bg-warning/90',
          )}
        >
          {loading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
