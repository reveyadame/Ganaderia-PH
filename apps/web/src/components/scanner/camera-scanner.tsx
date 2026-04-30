'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Flashlight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraScannerProps {
  onScan: (codigo: string) => void
  onClose: () => void
}

const ELEMENT_ID = 'camera-scanner-viewport'

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  // Ref para la instancia de Html5Qrcode, tipado como any porque el import es dinámico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const hasScanned = useRef(false)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // Import dinámico — evita errores de SSR (html5-qrcode usa APIs del navegador)
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return

        const scanner = new Html5Qrcode(ELEMENT_ID)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // cámara trasera
          {
            fps: 15,
            // Rectángulo estrecho, ideal para barcodes 1D (Code 128 de aretes SINIIGA)
            qrbox: { width: 300, height: 100 },
            aspectRatio: 1.7778, // 16:9
          },
          (text: string) => {
            if (hasScanned.current) return
            hasScanned.current = true
            // Vibración háptica si el dispositivo la soporta
            if (navigator.vibrate) navigator.vibrate(80)
            onScan(text.trim())
            onClose()
          },
          () => {
            // Errores por frame (ningún código detectado) — ignorar
          },
        )

        if (!cancelled) setReady(true)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('permission')) {
          setError('Permiso de cámara denegado. Actívalo en la configuración del navegador.')
        } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
          setError('No se encontró cámara en este dispositivo.')
        } else {
          setError('No se pudo abrir la cámara. Intenta recargar la página.')
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-4 bg-black/80">
        <div>
          <p className="text-white font-semibold text-base">Escanear código</p>
          <p className="text-white/50 text-xs mt-0.5">Apunta al código de barras del arete</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Viewport — html5-qrcode renderiza el video aquí */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <div id={ELEMENT_ID} className="w-full h-full" />

        {/* Overlay con guía visual */}
        {ready && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Esquinas del encuadre */}
            <div className="relative w-[320px] h-[110px]">
              {/* Línea de escaneo animada */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-brand animate-scan-line" />

              {/* Esquinas */}
              {[
                'top-0 left-0 border-t-2 border-l-2 rounded-tl',
                'top-0 right-0 border-t-2 border-r-2 rounded-tr',
                'bottom-0 left-0 border-b-2 border-l-2 rounded-bl',
                'bottom-0 right-0 border-b-2 border-r-2 rounded-br',
              ].map((cls, i) => (
                <div key={i} className={cn('absolute w-6 h-6 border-brand', cls)} />
              ))}
            </div>
          </div>
        )}

        {/* Loading inicial */}
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="h-7 w-7 text-red-400" />
            </div>
            <p className="text-white text-sm">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-safe-bottom py-4 bg-black/80 text-center">
        <p className="text-white/40 text-xs">
          Compatible con Code 128, QR, EAN y otros formatos
        </p>
      </div>
    </div>
  )
}
