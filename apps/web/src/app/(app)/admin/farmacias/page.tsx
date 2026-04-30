'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FlaskConical, Pencil, Trash2, MapPin } from 'lucide-react'
import { farmaciasApi, Farmacia, CreateFarmaciaInput } from '@/lib/api/farmacias.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge, ActiveBadge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

export default function FarmaciasPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Farmacia | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Farmacia | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: farmacias, isLoading } = useQuery({
    queryKey: ['farmacias'],
    queryFn: farmaciasApi.findAll,
  })

  const createMutation = useMutation({
    mutationFn: farmaciasApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmacias'] })
      toast('success', 'Farmacia creada correctamente')
      closeDialog()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al crear la farmacia'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateFarmaciaInput }) =>
      farmaciasApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmacias'] })
      toast('success', 'Farmacia actualizada')
      closeDialog()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: farmaciasApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmacias'] })
      toast('success', 'Farmacia desactivada')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al desactivar'),
  })

  const openCreate = () => {
    setEditTarget(null)
    setForm({ nombre: '', descripcion: '' })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (f: Farmacia) => {
    setEditTarget(f)
    setForm({ nombre: f.nombre, descripcion: f.descripcion ?? '' })
    setErrors({})
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditTarget(null)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs['nombre'] = 'El nombre es requerido'
    if (form.nombre.trim().length < 2) errs['nombre'] = 'Mínimo 2 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const data = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || undefined }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farmacias"
        description="Almacenes de medicamentos asignables a grupos de corrales"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva Farmacia
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : !farmacias?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={FlaskConical}
            title="Sin farmacias registradas"
            description="Crea la primera farmacia para empezar a gestionar medicamentos"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nueva Farmacia</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Grupos asignados</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {farmacias.map((f) => (
                <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <span className="font-medium text-foreground">{f.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{f.descripcion ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{f._count.gruposCorrales} grupo{f._count.gruposCorrales !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><ActiveBadge activo={f.activa} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(f)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(f)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
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

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? 'Editar farmacia' : 'Nueva farmacia'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            error={errors['nombre']}
            placeholder="Farmacia Matriz"
            required
          />
          <Input
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Descripción opcional"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" loading={isPending}>
              {editTarget ? 'Guardar cambios' : 'Crear farmacia'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Desactivar farmacia"
        description={`¿Desactivar "${deleteTarget?.nombre}"? Permanecerá en el historial pero dejará de estar disponible para asignación.`}
        confirmLabel="Desactivar"
      />
    </div>
  )
}
