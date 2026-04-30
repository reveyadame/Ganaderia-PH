'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import {
  comederoEstadosApi,
  EstadoComederoConfig,
  CreateEstadoConfigInput,
} from '@/lib/api/comederos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

const COLORES_SUGERIDOS = [
  { hex: '#22c55e', nombre: 'Verde' },
  { hex: '#84cc16', nombre: 'Lima' },
  { hex: '#eab308', nombre: 'Amarillo' },
  { hex: '#f97316', nombre: 'Naranja' },
  { hex: '#ef4444', nombre: 'Rojo' },
  { hex: '#6366f1', nombre: 'Índigo' },
  { hex: '#8b5cf6', nombre: 'Morado' },
  { hex: '#64748b', nombre: 'Gris' },
]

const emptyForm: CreateEstadoConfigInput = { nombre: '', orden: 0, color: '#22c55e' }

export default function EstadosComederoPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EstadoComederoConfig | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EstadoComederoConfig | null>(null)
  const [form, setForm] = useState<CreateEstadoConfigInput>({ ...emptyForm })

  const { data: estados, isLoading } = useQuery({
    queryKey: ['comedero-estados'],
    queryFn: comederoEstadosApi.findAll,
  })

  const createMutation = useMutation({
    mutationFn: comederoEstadosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comedero-estados'] })
      toast('success', 'Estado creado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al crear'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEstadoConfigInput> }) =>
      comederoEstadosApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comedero-estados'] })
      toast('success', 'Estado actualizado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => comederoEstadosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comedero-estados'] })
      toast('success', 'Estado eliminado')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al eliminar'),
  })

  function openCreate() {
    setEditTarget(null)
    setForm({ ...emptyForm, orden: (estados?.length ?? 0) })
    setModalOpen(true)
  }

  function openEdit(estado: EstadoComederoConfig) {
    setEditTarget(estado)
    setForm({ nombre: estado.nombre, orden: estado.orden, color: estado.color ?? '#22c55e' })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { toast('error', 'El nombre es obligatorio'); return }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estados del Comedero"
        description="Configura los estados cualitativos que los operadores pueden registrar al leer un comedero"
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo estado
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : !estados || estados.length === 0 ? (
        <EmptyState
          icon={GripVertical}
          title="Sin estados configurados"
          description='Crea estados como "Con comida", "Bien", "Lamido", "Muy lamido" con colores identificadores'
          action={<Button variant="primary" onClick={openCreate}>Crear primer estado</Button>}
        />
      ) : (
        <div className="space-y-2">
          {estados.map(estado => (
            <div
              key={estado.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-background px-4 py-3"
            >
              {/* Color pill */}
              <div
                className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                style={{ backgroundColor: estado.color ?? '#64748b' }}
              />

              {/* Nombre y badges */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="font-medium text-foreground">{estado.nombre}</span>
                {!estado.activo && <Badge variant="muted">Inactivo</Badge>}
                {(estado._count?.lecturas ?? 0) > 0 && (
                  <Badge variant="info">{estado._count!.lecturas} lecturas</Badge>
                )}
              </div>

              {/* Orden */}
              <span className="text-xs text-muted-foreground tabular-nums w-6 text-center">
                {estado.orden}
              </span>

              {/* Acciones */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => openEdit(estado)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(estado)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal crear/editar ──────────────────────────────────────────── */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Editar estado' : 'Nuevo estado'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Con comida, Bien, Lamido..."
          />
          <Input
            label="Orden (menor = primero)"
            type="number"
            min={0}
            value={form.orden ?? 0}
            onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))}
          />

          {/* Color picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORES_SUGERIDOS.map(c => (
                <button
                  key={c.hex}
                  title={c.nombre}
                  onClick={() => setForm(f => ({ ...f, color: c.hex }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === c.hex ? 'border-foreground scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border border-border shrink-0"
                style={{ backgroundColor: form.color ?? '#64748b' }}
              />
              <Input
                value={form.color ?? ''}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder="#RRGGBB"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando…' : editTarget ? 'Guardar cambios' : 'Crear estado'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Confirm delete ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Eliminar estado"
        description={
          deleteTarget?._count?.lecturas
            ? `"${deleteTarget.nombre}" tiene ${deleteTarget._count.lecturas} lecturas. Se desactivará (no se borrará el historial).`
            : `¿Eliminar el estado "${deleteTarget?.nombre}"?`
        }
        confirmLabel={deleteTarget?._count?.lecturas ? 'Desactivar' : 'Eliminar'}
        variant="danger"
      />
    </div>
  )
}
