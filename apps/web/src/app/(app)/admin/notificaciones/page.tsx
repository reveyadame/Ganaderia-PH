'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Bell, AlertTriangle, Info, Megaphone, CheckCheck, Eye, Trash2 } from 'lucide-react'
import { notificacionesApi, CreateNotificacionInput } from '@/lib/api/notificaciones.api'
import { usuariosApi } from '@/lib/api/usuarios.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { PrioridadNotificacion, TipoUsuario } from '@ganaderia/shared'

const PRIORIDAD_OPTIONS = [
  { value: PrioridadNotificacion.INFO, label: 'Informativa' },
  { value: PrioridadNotificacion.AVISO, label: 'Aviso' },
  { value: PrioridadNotificacion.CRITICA, label: 'Crítica (requiere confirmación)' },
]

function PrioridadBadge({ p }: { p: PrioridadNotificacion }) {
  if (p === PrioridadNotificacion.CRITICA) {
    return <Badge variant="danger" dot>Crítica</Badge>
  }
  if (p === PrioridadNotificacion.AVISO) {
    return <Badge variant="warning" dot>Aviso</Badge>
  }
  return <Badge variant="info" dot>Info</Badge>
}

function PrioridadIcon({ p }: { p: PrioridadNotificacion }) {
  if (p === PrioridadNotificacion.CRITICA) return <AlertTriangle className="h-4 w-4 text-danger" />
  if (p === PrioridadNotificacion.AVISO) return <Megaphone className="h-4 w-4 text-warning" />
  return <Info className="h-4 w-4 text-info" />
}

export default function NotificacionesAdminPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState<CreateNotificacionInput>({
    titulo: '',
    mensaje: '',
    prioridad: PrioridadNotificacion.INFO,
    destinatariosIds: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: notificaciones, isLoading } = useQuery({
    queryKey: ['notificaciones-emitidas'],
    queryFn: notificacionesApi.listarEmitidas,
  })

  const { data: usuarios } = useQuery({ queryKey: ['usuarios'], queryFn: usuariosApi.findAll })
  const operadores = (usuarios ?? []).filter((u) => u.activo && u.tipo === TipoUsuario.OPERADOR)

  const { data: detail } = useQuery({
    queryKey: ['notificacion-detalle', detailId],
    queryFn: () => notificacionesApi.detalle(detailId!),
    enabled: !!detailId,
  })

  const createMutation = useMutation({
    mutationFn: notificacionesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones-emitidas'] })
      toast('success', 'Notificación enviada')
      closeCreate()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al enviar'),
  })

  const deleteMutation = useMutation({
    mutationFn: notificacionesApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notificaciones-emitidas'] })
      toast('success', 'Notificación eliminada')
      setDeleteId(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al eliminar'),
  })

  const openCreate = () => {
    setForm({ titulo: '', mensaje: '', prioridad: PrioridadNotificacion.INFO, destinatariosIds: [] })
    setErrors({})
    setCreateOpen(true)
  }

  const closeCreate = () => setCreateOpen(false)

  const toggleDestinatario = (id: string) => {
    setForm((f) => ({
      ...f,
      destinatariosIds: f.destinatariosIds.includes(id)
        ? f.destinatariosIds.filter((x) => x !== id)
        : [...f.destinatariosIds, id],
    }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (form.titulo.trim().length < 2) errs['titulo'] = 'Mínimo 2 caracteres'
    if (form.mensaje.trim().length < 2) errs['mensaje'] = 'Escribe el mensaje'
    if (form.destinatariosIds.length === 0) errs['destinatariosIds'] = 'Selecciona al menos un operador'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    createMutation.mutate({ ...form, titulo: form.titulo.trim(), mensaje: form.mensaje.trim() })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Envía mensajes a los operadores y revisa quién los leyó"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nueva notificación</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : !notificaciones?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Bell}
            title="Sin notificaciones"
            description="Crea la primera notificación para tus operadores"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nueva notificación</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Notificación</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Lecturas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Enviada</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {notificaciones.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <PrioridadIcon p={n.prioridad} />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{n.titulo}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{n.mensaje}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><PrioridadBadge p={n.prioridad} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="tabular-nums font-medium text-foreground">{n.leidasCount}</span>
                        <span>/ {n.destinatariosCount}</span>
                      </span>
                      {n.prioridad === PrioridadNotificacion.CRITICA && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span className="tabular-nums font-medium text-foreground">{n.confirmadasCount}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{formatDateTime(n.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDetailId(n.id)} title="Ver detalle"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(n.id)} title="Eliminar"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger-subtle transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={closeCreate} title="Nueva notificación" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            error={errors['titulo']}
            placeholder="Ejemplo: Cambio de turno mañana"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Mensaje</label>
            <textarea
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/5"
              placeholder="Escribe el contenido del mensaje..."
              maxLength={1000}
            />
            {errors['mensaje'] && <p className="text-xs text-danger">{errors['mensaje']}</p>}
          </div>
          <Select
            label="Prioridad"
            value={form.prioridad}
            onChange={(e) => setForm({ ...form, prioridad: e.target.value as PrioridadNotificacion })}
            options={PRIORIDAD_OPTIONS}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destinatarios</p>
            {operadores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay operadores activos en el sistema.</p>
            ) : (
              <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {operadores.map((u) => {
                  const checked = form.destinatariosIds.includes(u.id)
                  return (
                    <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDestinatario(u.id)}
                        className="w-4 h-4 rounded border-border accent-brand"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.nombre} {u.apellido}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            {errors['destinatariosIds'] && <p className="text-xs text-danger">{errors['destinatariosIds']}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeCreate}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending}>Enviar</Button>
          </div>
        </form>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onClose={() => setDetailId(null)} title={detail?.titulo ?? 'Cargando…'} size="lg">
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PrioridadBadge p={detail.prioridad} />
              <span className="text-xs text-muted-foreground">{formatDateTime(detail.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{detail.mensaje}</p>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destinatarios</p>
                <span className="text-xs text-muted-foreground">
                  {detail.leidasCount}/{detail.destinatariosCount} leídas
                  {detail.prioridad === PrioridadNotificacion.CRITICA && ` · ${detail.confirmadasCount} confirmadas`}
                </span>
              </div>
              <div className="rounded-lg border border-border divide-y divide-border max-h-[300px] overflow-y-auto">
                {detail.destinatarios.map((d) => (
                  <div key={d.usuario.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{d.usuario.nombre} {d.usuario.apellido}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{d.usuario.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      {d.confirmadaEn ? (
                        <Badge variant="success" dot>Confirmada</Badge>
                      ) : d.leidaEn ? (
                        <Badge variant="info" dot>Leída</Badge>
                      ) : (
                        <Badge variant="muted">Sin leer</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">Cargando detalle…</div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Eliminar notificación"
        description="¿Eliminar esta notificación? Los operadores ya no la verán."
        confirmLabel="Eliminar"
      />
    </div>
  )
}
