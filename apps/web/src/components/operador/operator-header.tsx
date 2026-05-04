'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { TipoUsuario } from '@ganaderia/shared'
import { GrupoSelector } from './grupo-selector'
import { NotificationBell } from './notification-bell'

export function OperatorHeader() {
  const router = useRouter()
  const { usuario, clearAuth } = useAuthStore()
  const esOperador = usuario?.tipo === TipoUsuario.OPERADOR

  const initials = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U'

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="h-full max-w-[480px] mx-auto px-4 flex items-center gap-3">
        <Link href="/operador" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-brand text-brand-foreground flex items-center justify-center shadow-xs">
            <span className="text-[11px] font-bold">G</span>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
            {usuario?.nombre} {usuario?.apellido}
          </p>
          <GrupoSelector />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <NotificationBell />
          {!esOperador && (
            <button
              onClick={() => router.push('/dashboard')}
              aria-label="Volver a vista admin"
              title="Volver a vista admin"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-subtle active:bg-danger-subtle transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
