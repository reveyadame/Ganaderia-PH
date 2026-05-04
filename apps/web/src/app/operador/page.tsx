'use client'

import type { Route } from 'next'
import { PawPrint, Syringe, UtensilsCrossed, Scale, Sparkles } from 'lucide-react'
import { TaskCard } from '@/components/operador/task-card'
import { CriticalNotifications } from '@/components/operador/critical-notifications'
import { useAuthStore } from '@/stores/auth.store'
import { ActividadUsuario } from '@ganaderia/shared'

interface TaskDef {
  href: Route
  label: string
  description: string
  icon: React.ElementType
  tone: 'brand' | 'success' | 'info' | 'warning' | 'accent'
  actividad: ActividadUsuario
}

const TASKS: TaskDef[] = [
  {
    href: '/operador/animales/nuevo',
    label: 'Registrar animal',
    description: 'Alta de un nuevo animal en el sistema',
    icon: PawPrint,
    tone: 'info',
    actividad: ActividadUsuario.REGISTRO,
  },
  {
    href: '/operador/tratamientos',
    label: 'Aplicar tratamiento',
    description: 'Escanea, elige el kit y registra la dosis',
    icon: Syringe,
    tone: 'accent',
    actividad: ActividadUsuario.TRATAMIENTOS,
  },
  {
    href: '/operador/comederos',
    label: 'Lectura de comederos',
    description: 'Estado del comedero por corral',
    icon: UtensilsCrossed,
    tone: 'warning',
    actividad: ActividadUsuario.COMEDEROS,
  },
  {
    href: '/operador/raciones',
    label: 'Surtir ración',
    description: 'Registra la cantidad surtida del turno',
    icon: Scale,
    tone: 'success',
    actividad: ActividadUsuario.RACIONES,
  },
]

function saludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function OperadorHomePage() {
  const { usuario } = useAuthStore()
  const tareasVisibles = TASKS.filter((t) => usuario?.actividades.includes(t.actividad))

  return (
    <div className="space-y-5">
      <div className="space-y-1 pt-1">
        <p className="text-[13px] text-muted-foreground">{saludo()},</p>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">
          {usuario?.nombre ?? 'Operador'}
        </h1>
      </div>

      <CriticalNotifications />

      {tareasVisibles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-[14px] font-medium text-foreground">Sin actividades asignadas</p>
          <p className="text-[12px] text-muted-foreground">
            Pídele a tu director que te asigne actividades para empezar a trabajar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-bold tracking-widest uppercase text-foreground/40 px-1">
            ¿Qué vas a hacer?
          </p>
          <div className="space-y-3">
            {tareasVisibles.map((t) => (
              <TaskCard
                key={t.href}
                href={t.href}
                label={t.label}
                description={t.description}
                icon={t.icon}
                tone={t.tone}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
