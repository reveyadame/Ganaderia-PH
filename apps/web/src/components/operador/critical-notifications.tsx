'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCheck } from 'lucide-react'
import { notificacionesApi } from '@/lib/api/notificaciones.api'
import { Button } from '@/components/ui/button'
import { useMisNotificaciones } from './notification-bell'
import { PrioridadNotificacion } from '@ganaderia/shared'

export function CriticalNotifications() {
  const qc = useQueryClient()
  const { data: notifs } = useMisNotificaciones()

  const pendientes = (notifs ?? []).filter(
    (n) => n.prioridad === PrioridadNotificacion.CRITICA && !n.confirmadaEn,
  )

  const confirmarMutation = useMutation({
    mutationFn: notificacionesApi.confirmar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-notificaciones'] }),
  })

  if (pendientes.length === 0) return null

  return (
    <div className="space-y-3">
      {pendientes.map((n) => (
        <div
          key={n.id}
          className="rounded-2xl border-2 border-danger/40 bg-danger-subtle p-4 space-y-3 animate-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/15 border border-danger/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase text-danger-foreground">
                Aviso crítico
              </p>
              <p className="text-[16px] font-bold text-foreground tracking-tight leading-tight mt-0.5">
                {n.titulo}
              </p>
              <p className="text-[13px] text-foreground/80 leading-snug mt-1.5">{n.mensaje}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                {n.autor.nombre} {n.autor.apellido}
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => confirmarMutation.mutate(n.id)}
            disabled={confirmarMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Entendido
          </Button>
        </div>
      ))}
    </div>
  )
}
