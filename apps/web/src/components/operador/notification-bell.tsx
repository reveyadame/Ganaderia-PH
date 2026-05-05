'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X, AlertTriangle, Info, Megaphone, CheckCheck, Inbox } from 'lucide-react'
import { notificacionesApi } from '@/lib/api/notificaciones.api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PrioridadNotificacion, NotificacionMia } from '@ganaderia/shared'

const POLL_MS = 30_000

export function useMisNotificaciones() {
  return useQuery({
    queryKey: ['mis-notificaciones'],
    queryFn: notificacionesApi.listarMias,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })
}

function formatRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

function PrioridadIcon({ p }: { p: PrioridadNotificacion }) {
  const cls = 'h-4 w-4 shrink-0'
  if (p === PrioridadNotificacion.CRITICA) return <AlertTriangle className={cn(cls, 'text-danger')} />
  if (p === PrioridadNotificacion.AVISO) return <Megaphone className={cn(cls, 'text-warning')} />
  return <Info className={cn(cls, 'text-info')} />
}

function NotificacionItem({
  notif,
  onLeer,
  onConfirmar,
  isPending,
}: {
  notif: NotificacionMia
  onLeer: (id: string) => void
  onConfirmar: (id: string) => void
  isPending: boolean
}) {
  const noLeida = !notif.leidaEn
  const noConfirmada = notif.prioridad === PrioridadNotificacion.CRITICA && !notif.confirmadaEn

  return (
    <div
      onClick={() => noLeida && onLeer(notif.id)}
      className={cn(
        'p-4 transition-colors',
        noLeida
          ? 'bg-brand/5 active:bg-brand/15 cursor-pointer'
          : 'cursor-default',
      )}
    >
      <div className="flex items-start gap-3">
        <PrioridadIcon p={notif.prioridad} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className={cn(
              'text-[14px] leading-tight',
              noLeida ? 'font-bold text-foreground' : 'font-medium text-foreground/70',
            )}>
              {notif.titulo}
            </p>
            {noLeida && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug">{notif.mensaje}</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {notif.autor.nombre} {notif.autor.apellido} · {formatRelativo(notif.createdAt)}
          </p>

          {noConfirmada && (
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={(e) => {
                e.stopPropagation()
                onConfirmar(notif.id)
              }}
              disabled={isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Entendido
            </Button>
          )}
          {notif.confirmadaEn && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-success-foreground">
              <CheckCheck className="h-3 w-3" />
              Confirmada
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  // Needed to avoid SSR mismatch when using createPortal
  const [mounted, setMounted] = useState(false)
  const { data: notifs } = useMisNotificaciones()

  const noLeidas = useMemo(() => (notifs ?? []).filter((n) => !n.leidaEn).length, [notifs])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const leerMutation = useMutation({
    mutationFn: notificacionesApi.marcarLeida,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-notificaciones'] }),
  })
  const confirmarMutation = useMutation({
    mutationFn: notificacionesApi.confirmar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-notificaciones'] }),
  })

  const drawer = (
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Panel — slides in from right, full-height */}
      <div className="relative ml-auto w-full max-w-[480px] h-full bg-surface flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <p className="text-[15px] font-semibold text-foreground">Notificaciones</p>
            {noLeidas > 0 && (
              <Badge variant="danger" className="text-[10px]">{noLeidas} sin leer</Badge>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {!notifs || notifs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-2">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-[14px] font-medium text-foreground">Sin notificaciones</p>
              <p className="text-[12px] text-muted-foreground">
                Te avisaremos cuando tu director te envíe un mensaje.
              </p>
            </div>
          ) : (
            notifs.map((n) => (
              <NotificacionItem
                key={n.id}
                notif={n}
                onLeer={(id) => leerMutation.mutate(id)}
                onConfirmar={(id) => confirmarMutation.mutate(id)}
                isPending={confirmarMutation.isPending}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Notificaciones"
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
      >
        <Bell className="h-4 w-4" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {mounted && open && createPortal(drawer, document.body)}
    </>
  )
}
