'use client'

import { useEffect, useState } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Smartphone, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { ActividadUsuario, TipoUsuario } from '@ganaderia/shared'

const DISMISS_KEY = 'operador-banner-dismissed'

const ACTIVIDADES_CAMPO: ActividadUsuario[] = [
  ActividadUsuario.REGISTRO,
  ActividadUsuario.TRATAMIENTOS,
  ActividadUsuario.COMEDEROS,
  ActividadUsuario.RACIONES,
]

export function MobileOperatorBanner() {
  const router = useRouter()
  const { usuario } = useAuthStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!usuario) return
    if (usuario.tipo === TipoUsuario.OPERADOR) return
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    if (dismissed) return
    const tieneActividadesCampo =
      usuario.tipo === TipoUsuario.SUPERUSUARIO ||
      usuario.actividades.some((a) => ACTIVIDADES_CAMPO.includes(a))
    if (!tieneActividadesCampo) return
    setVisible(true)
  }, [usuario])

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="md:hidden px-4 pt-3">
      <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 p-3">
        <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
          <Smartphone className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">¿Estás en campo?</p>
          <button
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, '1')
              router.push('/operador' as Route)
            }}
            className="text-[12px] text-brand font-medium hover:underline mt-0.5"
          >
            Cambiar a vista operador →
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
