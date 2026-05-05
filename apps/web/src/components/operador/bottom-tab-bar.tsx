'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { Home, Syringe, UtensilsCrossed, Scale } from 'lucide-react'
import { CattleIcon } from '@/components/icons/cattle-icon'
import { useAuthStore } from '@/stores/auth.store'
import { ActividadUsuario } from '@ganaderia/shared'
import { cn } from '@/lib/utils'

interface Tab {
  href: Route
  label: string
  icon: React.ElementType
  actividad?: ActividadUsuario
}

const TABS: Tab[] = [
  { href: '/operador', label: 'Inicio', icon: Home },
  { href: '/operador/animales/nuevo', label: 'Registrar', icon: CattleIcon, actividad: ActividadUsuario.REGISTRO },
  { href: '/operador/tratamientos', label: 'Tratar', icon: Syringe, actividad: ActividadUsuario.TRATAMIENTOS },
  { href: '/operador/comederos', label: 'Comederos', icon: UtensilsCrossed, actividad: ActividadUsuario.COMEDEROS },
  { href: '/operador/raciones', label: 'Raciones', icon: Scale, actividad: ActividadUsuario.RACIONES },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const { usuario } = useAuthStore()

  if (!usuario) return null

  const visibleTabs = TABS.filter((tab) => !tab.actividad || usuario.actividades.includes(tab.actividad))

  if (visibleTabs.length <= 1) return null

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-[480px] mx-auto h-16 px-1 flex items-stretch">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.href === '/operador' ? pathname === '/operador' : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 relative',
                'transition-colors active:bg-muted/40',
                isActive ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-brand" />
              )}
              <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.9} />
              <span className={cn('text-[10px] tracking-tight truncate max-w-full px-1', isActive && 'font-semibold')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
