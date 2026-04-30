'use client'

import { useRef, useEffect, useState } from 'react'
import { ScanLine, X, Loader2, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CameraScanner } from './camera-scanner'

interface BarcodeInputProps {
  onScan: (codigo: string) => void
  loading?: boolean
  placeholder?: string
  label?: string
  autoFocus?: boolean
  resetAfterScan?: boolean
  className?: string
  disabled?: boolean
  /** Muestra el botón de cámara (default: true) */
  showCamera?: boolean
}

export function BarcodeInput({
  onScan,
  loading = false,
  placeholder = 'Escanea o escribe el código...',
  label,
  autoFocus = true,
  resetAfterScan = false,
  className,
  disabled = false,
  showCamera = true,
}: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [pulse, setPulse] = useState<'idle' | 'success'>('idle')
  const [cameraOpen, setCameraOpen] = useState(false)

  useEffect(() => {
    if (autoFocus && !cameraOpen) inputRef.current?.focus()
  }, [autoFocus, cameraOpen])

  const handleScan = (codigo: string) => {
    const trimmed = codigo.trim()
    if (!trimmed) return
    setPulse('success')
    onScan(trimmed)
    if (resetAfterScan) {
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setValue(trimmed)
    }
    setTimeout(() => setPulse('idle'), 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleScan(value)
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  const handleCameraScan = (codigo: string) => {
    setCameraOpen(false)
    handleScan(codigo)
  }

  const borderColor = pulse === 'success'
    ? 'border-green-500'
    : 'border-border focus-within:border-brand'

  return (
    <>
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label className="block text-sm font-medium text-foreground">{label}</label>
        )}

        <div className={cn(
          'relative flex items-center rounded-lg border-2 bg-background transition-all duration-200',
          borderColor,
          disabled && 'opacity-50',
        )}>
          {/* Ícono de estado */}
          <div className="pl-3.5 text-muted-foreground shrink-0">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            ) : (
              <ScanLine className={cn(
                'h-5 w-5 transition-colors duration-300',
                pulse === 'success' && 'text-green-500',
              )} />
            )}
          </div>

          {/* Input — también captura escáneres USB/BT que simulan teclado */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={cn(
              'flex-1 h-12 px-3 bg-transparent text-sm font-mono text-foreground',
              'placeholder:text-muted-foreground placeholder:font-sans placeholder:text-xs',
              'focus:outline-none',
            )}
          />

          {/* Botones derecha */}
          <div className="flex items-center gap-1 pr-2">
            {value && !loading && (
              <button
                type="button"
                onClick={() => { setValue(''); inputRef.current?.focus() }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {showCamera && (
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => setCameraOpen(true)}
                title="Escanear con cámara"
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  'text-muted-foreground hover:text-brand hover:bg-brand/10',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Ayuda */}
        <p className="text-xs text-muted-foreground">
          Usa un lector Bluetooth, escribe y presiona Enter
          {showCamera && (
            <>
              {' '}·{' '}
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="text-brand hover:underline"
              >
                o escanea con la cámara
              </button>
            </>
          )}
        </p>
      </div>

      {/* Overlay de cámara — pantalla completa */}
      {cameraOpen && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  )
}
