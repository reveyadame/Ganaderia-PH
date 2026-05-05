'use client'

import { useEffect, useState } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { PageTransition } from '@/components/animations/PageTransition'
import { LoadingScreen } from '@/components/animations/LoadingScreen'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileOperatorBanner } from '@/components/layout/mobile-operator-banner'
import { useAuthStore } from '@/stores/auth.store'
import { ActividadUsuario, TipoUsuario } from '@ganaderia/shared'

const RUTAS_POR_ACTIVIDAD: [string, ActividadUsuario][] = [
  ['/animales', ActividadUsuario.REGISTRO],
  ['/farmacia', ActividadUsuario.FARMACIA],
  ['/comederos', ActividadUsuario.COMEDEROS],
  ['/raciones', ActividadUsuario.RACIONES],
  ['/reportes', ActividadUsuario.REPORTES],
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accessToken = useAuthStore((s) => s.accessToken)
  const usuario = useAuthStore((s) => s.usuario)

  useEffect(() => {
    setHydrated(true)
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!accessToken) {
      router.replace('/login')
      return
    }
    if (usuario?.tipo === TipoUsuario.OPERADOR) {
      router.replace('/operador' as Route)
      return
    }
    if (usuario?.tipo === TipoUsuario.DIRECTOR) {
      // Administración solo para SUPERUSUARIO
      if (pathname.startsWith('/admin')) {
        router.replace('/dashboard' as Route)
        return
      }
      // Redirigir a dashboard si no tiene actividad para la sección actual
      for (const [prefix, actividad] of RUTAS_POR_ACTIVIDAD) {
        if (pathname.startsWith(prefix) && !usuario.actividades.includes(actividad)) {
          router.replace('/dashboard' as Route)
          return
        }
      }
    }
  }, [hydrated, accessToken, usuario, router, pathname])

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  if (!hydrated) {
    return <LoadingScreen />
  }

  if (!accessToken) return null

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-surface-sunken min-w-0">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface md:hidden shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-brand text-brand-foreground flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold">G</span>
            </div>
            <span className="text-[14px] font-semibold text-foreground truncate">Ganadería PH</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <MobileOperatorBanner />
          <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-10 py-6 md:py-8">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  )
}
