'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Scale, Pencil, Trash2 } from 'lucide-react'
import { racionesCatalogoApi, RacionCatalogoItem, CreateRacionCatalogoInput } from '@/lib/api/raciones-catalogo.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge, ActiveBadge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

export default function RacionesCatalogoPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [target, setTarget] = useState<RacionCatalogoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RacionCatalogoItem | null>(null)
  const [form, setForm] = useState<CreateRacionCatalogoInput>({ nombre: '', descripcion: '' })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['raciones-catalogo'],
    queryFn: racionesCatalogoApi.findAll,
  })

  const createMutation = useMutation({
    mutationFn: racionesCatalogoApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raciones-catalogo'] })
      toast('success', 'Ración creada')
      close()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateRacionCatalogoInput }) =>
      racionesCatalogoApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raciones-catalogo'] })
      toast('success', 'Ración actualizada')
      close()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: racionesCatalogoApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raciones-catalogo'] })
      toast('success', 'Ración desactivada')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const openCreate = () => {
    setForm({ nombre: '', descripcion: '' })
    setError('')
    setTarget(null)
    setMode('create')
  }

  const openEdit = (r: RacionCatalogoItem) => {
    setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '' })
    setError('')
    setTarget(r)
    setMode('edit')
  }

  const close = () => { setMode(null); setTarget(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.nombre.trim().length < 2) { setError('Mínimo 2 caracteres'); return }
    const data = { nombre: form.nombre.trim(), descripcion: form.descripcion?.trim() || undefined }
    if (mode === 'create') createMutation.mutate(data)
    else if (target) updateMutation.mutate({ id: target.id, data })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de raciones"
        description="Solo nombres. Las cantidades por corral se asignan en Definir ración."
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nueva ración</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : !data?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Scale}
            title="Sin raciones en el catálogo"
            description="Crea la primera ración del catálogo para asignarla a corrales"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nueva ración</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Asignaciones</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{r.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {r.descripcion ? <span className="line-clamp-1">{r.descripcion}</span> : <span>—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="muted" className="text-[10px]">
                      {r._count?.definiciones ?? 0} definiciones
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5"><ActiveBadge activo={r.activo} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} title="Editar"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(r)} title="Desactivar"
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

      <Dialog open={mode !== null} onClose={close}
        title={mode === 'create' ? 'Nueva ración' : 'Editar ración'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            error={error}
            placeholder="Ej: Engorda fase 2"
            required
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Descripción (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/5"
              placeholder="Composición o uso recomendado..."
              maxLength={300}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={close}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Desactivar ración"
        description={`¿Desactivar "${deleteTarget?.nombre}"? Las raciones definidas con ella no se verán afectadas, pero ya no podrá asignarse a nuevos corrales.`}
        confirmLabel="Desactivar"
      />
    </div>
  )
}
