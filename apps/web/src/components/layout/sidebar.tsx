'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, PawPrint, Syringe, UtensilsCrossed,
  Scale, Package, Users, MapPin, LogOut, Bell, Plus, History,
  FlaskConical, ArrowUpFromLine, BarChart3, Smartphone,
  PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { farmaciasApi } from '@/lib/api/farmacias.api'
import { ActividadUsuario, TipoUsuario } from '@ganaderia/shared'

interface NavItem {
  href: Route
  label: string
  icon: React.ElementType
  actividad?: ActividadUsuario
  soloSuperuser?: boolean
  soloReportes?: boolean
}

const NAV_GRUPOS: { titulo: string; items: NavItem[] }[] = [
  {
    titulo: 'Operación',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/animales', label: 'Animales', icon: PawPrint, actividad: ActividadUsuario.REGISTRO },
      { href: '/operador', label: 'Vista operador', icon: Smartphone },
    ],
  },
  {
    titulo: 'Raciones',
    items: [
      { href: '/raciones', label: 'Activas', icon: Scale, actividad: ActividadUsuario.RACIONES },
      { href: '/raciones/definir', label: 'Definir', icon: Plus, actividad: ActividadUsuario.RACIONES },
      { href: '/raciones/historial', label: 'Historial', icon: History, actividad: ActividadUsuario.RACIONES },
    ],
  },
  {
    titulo: 'Comederos',
    items: [
      { href: '/comederos', label: 'Estado actual', icon: UtensilsCrossed, actividad: ActividadUsuario.COMEDEROS },
      { href: '/comederos/historial', label: 'Historial lecturas', icon: History, actividad: ActividadUsuario.COMEDEROS },
    ],
  },
  {
    titulo: 'Reportes',
    items: [
      { href: '/reportes/animales', label: 'Costo por animal', icon: BarChart3, soloReportes: true },
      { href: '/reportes/tratamientos', label: 'Tratamientos', icon: BarChart3, soloReportes: true },
    ],
  },
  {
    titulo: 'Farmacia',
    items: [
      { href: '/farmacia', label: 'Resumen', icon: FlaskConical, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/medicamentos', label: 'Medicamentos', icon: FlaskConical, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/inventario', label: 'Inventario', icon: Package, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/salidas', label: 'Salidas', icon: ArrowUpFromLine, actividad: ActividadUsuario.FARMACIA },
      { href: '/farmacia/ajustes', label: 'Historial de ajustes', icon: History, actividad: ActividadUsuario.FARMACIA },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { href: '/admin/farmacias', label: 'Farmacias', icon: FlaskConical, actividad: ActividadUsuario.FARMACIA },
      { href: '/admin/corrales', label: 'Corrales', icon: MapPin, soloSuperuser: true },
      { href: '/admin/aretes', label: 'Aretes blancos', icon: Package, actividad: ActividadUsuario.REGISTRO },
      { href: '/admin/tratamientos/kits', label: 'Kits de tratamiento', icon: Syringe, actividad: ActividadUsuario.TRATAMIENTOS },
      { href: '/admin/comederos/estados', label: 'Estados comedero', icon: UtensilsCrossed, actividad: ActividadUsuario.COMEDEROS },
      { href: '/admin/raciones-catalogo', label: 'Catálogo de raciones', icon: Scale, actividad: ActividadUsuario.RACIONES },
      { href: '/admin/notificaciones', label: 'Notificaciones', icon: Bell },
      { href: '/admin/usuarios', label: 'Usuarios', icon: Users, soloSuperuser: true },
    ],
  },
]

const TIPO_LABEL: Record<TipoUsuario, string> = {
  [TipoUsuario.SUPERUSUARIO]: 'Superusuario',
  [TipoUsuario.DIRECTOR]: 'Director',
  [TipoUsuario.OPERADOR]: 'Operador',
}

export interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { usuario, clearAuth } = useAuthStore()

  // El director solo ve la sección Farmacia si tiene acceso a alguna farmacia
  // (derivado de sus grupos de corrales asignados). El backend ya filtra por usuario.
  const tieneActividadFarmacia = !!usuario && (
    usuario.tipo === TipoUsuario.SUPERUSUARIO ||
    usuario.actividades.includes(ActividadUsuario.FARMACIA)
  )
  const necesitaCheckFarmacias = !!usuario && usuario.tipo === TipoUsuario.DIRECTOR && tieneActividadFarmacia
  const { data: farmaciasAccesibles } = useQuery({
    queryKey: ['farmacias'],
    queryFn: farmaciasApi.findAll,
    enabled: necesitaCheckFarmacias,
  })
  const ocultarFarmacia = necesitaCheckFarmacias && farmaciasAccesibles !== undefined && farmaciasAccesibles.length === 0

  const canView = (item: NavItem): boolean => {
    if (!usuario) return false
    if (usuario.tipo === TipoUsuario.SUPERUSUARIO) return true
    if (item.soloSuperuser) return false
    if (item.soloReportes) return usuario.actividades.includes(ActividadUsuario.REPORTES)
    if (!item.actividad) return true
    return usuario.actividades.includes(item.actividad)
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const initials = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U'

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border-strong bg-surface',
        'transition-[width,transform] duration-300 ease-out',
        // Mobile: fixed full-height drawer
        'fixed inset-y-0 left-0 z-50 h-full',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: part of flex layout
        'md:relative md:translate-x-0 md:z-auto md:h-full',
        // Width
        'w-[248px] overflow-hidden',
        collapsed && 'md:w-[64px]',
      )}
    >
      {/* Header */}
      <div className={cn(
        'pt-4 pb-3 flex items-center h-16',
        collapsed ? 'px-2 flex-col justify-center gap-1' : 'px-3 gap-1',
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand text-brand-foreground flex items-center justify-center shadow-xs shrink-0">
          <span className="text-[13px] font-bold tracking-tight">G</span>
        </div>

        <div className={cn(
          'min-w-0 flex-1 px-1.5 transition-opacity duration-200',
          collapsed ? 'opacity-0 md:hidden' : 'opacity-100',
        )}>
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight">Ganadería PH</p>
          <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">Sistema de gestión</p>
        </div>

        <div className={cn('flex items-center gap-1', collapsed && 'md:flex-col')}>
          <button
            onClick={onToggle}
            className="hidden md:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          {!collapsed && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mx-3 border-t border-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-hide">
        {NAV_GRUPOS.map((grupo) => {
          if (ocultarFarmacia && grupo.titulo === 'Farmacia') return null
          const itemsVisibles = grupo.items.filter(canView)
          if (itemsVisibles.length === 0) return null

          return (
            <div key={grupo.titulo} className="space-y-0.5">
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-3 mb-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0" />
                  <p className="text-[10px] font-bold text-foreground/40 tracking-[0.1em] uppercase">
                    {grupo.titulo}
                  </p>
                </div>
              )}
              {collapsed && <div className="h-px bg-border mx-1 mb-2" />}

              <div className="space-y-0.5">
                {itemsVisibles.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center rounded-lg text-[13px] h-9',
                        'transition-colors duration-150 cursor-pointer',
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                        isActive
                          ? 'bg-brand/8 text-brand font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      {isActive && !collapsed && (
                        <span className="absolute right-2 w-1 h-4 rounded-full bg-brand" />
                      )}
                      <Icon
                        className={cn(
                          'shrink-0 transition-colors',
                          collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]',
                          isActive
                            ? 'text-brand'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-2">
        <div className={cn(
          'flex items-center rounded-xl p-1.5',
          collapsed ? 'flex-col gap-2' : 'gap-3 hover:bg-muted/40 transition-colors',
        )}>
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              <span className="text-xs font-bold text-brand tracking-tight">{initials}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {usuario?.nombre}
              </p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {usuario ? TIPO_LABEL[usuario.tipo] : ''}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className={cn(
              'flex items-center justify-center rounded-lg transition-colors cursor-pointer',
              'text-muted-foreground hover:text-danger hover:bg-danger-subtle',
              collapsed ? 'w-8 h-8' : 'p-1.5',
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
