'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, PawPrint, Syringe, UtensilsCrossed,
  Scale, Package, Users, MapPin, LogOut, ShieldCheck,
  FlaskConical, ArrowUpFromLine, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { ActividadUsuario, TipoUsuario } from '@ganaderia/shared'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  actividad?: ActividadUsuario
  soloAdmin?: boolean
}

const NAV_GRUPOS: { titulo: string; items: NavItem[] }[] = [
  {
    titulo: 'OPERACIÓN',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/animales', label: 'Animales', icon: PawPrint, actividad: ActividadUsuario.REGISTRO },
      { href: '/tratamientos', label: 'Tratamientos', icon: Syringe, actividad: ActividadUsuario.TRATAMIENTOS },
      { href: '/comederos', label: 'Comederos', icon: UtensilsCrossed, actividad: ActividadUsuario.COMEDEROS },
      { href: '/raciones', label: 'Raciones', icon: Scale, actividad: ActividadUsuario.RACIONES },
    ],
  },
  {
    titulo: 'REPORTES',
    items: [
      { href: '/reportes/animales', label: 'Costo por animal', icon: BarChart2 },
      { href: '/reportes/tratamientos', label: 'Tratamientos', icon: BarChart2 },
    ],
  },
  {
    titulo: 'FARMACIA',
    items: [
      { href: '/farmacia', label: 'Resumen', icon: FlaskConical, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/medicamentos', label: 'Medicamentos', icon: FlaskConical, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/inventario', label: 'Inventario', icon: Package, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/salidas', label: 'Salidas', icon: ArrowUpFromLine, actividad: ActividadUsuario.FARMACIA },
    ],
  },
  {
    titulo: 'ADMINISTRACIÓN',
    items: [
      { href: '/admin/farmacias', label: 'Farmacias', icon: FlaskConical, soloAdmin: true },
      { href: '/admin/corrales', label: 'Corrales', icon: MapPin, soloAdmin: true },
      { href: '/admin/aretes', label: 'Aretes blancos', icon: Package, soloAdmin: true },
      { href: '/admin/tratamientos/kits', label: 'Kits de tratamiento', icon: Syringe, soloAdmin: true },
      { href: '/admin/comederos/estados', label: 'Estados comedero', icon: UtensilsCrossed, soloAdmin: true },
      { href: '/admin/usuarios', label: 'Usuarios', icon: Users, soloAdmin: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, clearAuth } = useAuthStore()

  const canView = (item: NavItem): boolean => {
    if (!usuario) return false
    if (usuario.tipo === TipoUsuario.SUPERUSUARIO) return true
    if (item.soloAdmin) {
      return [TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN].includes(usuario.tipo)
    }
    if (!item.actividad) return true
    if ([TipoUsuario.ADMIN, TipoUsuario.DIRECTOR].includes(usuario.tipo)) return true
    return usuario.actividades.includes(item.actividad)
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-surface flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">G</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Ganadería PH</p>
          <p className="text-xs text-muted-foreground truncate">{usuario?.nombre}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GRUPOS.map((grupo) => {
          const itemsVisibles = grupo.items.filter(canView)
          if (itemsVisibles.length === 0) return null

          return (
            <div key={grupo.titulo}>
              <p className="px-2 mb-1 text-[10px] font-semibold text-muted-foreground tracking-wider">
                {grupo.titulo}
              </p>
              <div className="space-y-0.5">
                {itemsVisibles.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-brand/10 text-brand font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{usuario?.tipo?.toLowerCase()}</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
