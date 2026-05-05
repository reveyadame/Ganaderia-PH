'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Syringe, Pencil, Trash2, GripVertical, X } from 'lucide-react'
import {
  tratamientoTemplatesApi,
  TratamientoTemplate,
  CreateTemplateInput,
  CreateTemplateItemInput,
} from '@/lib/api/tratamientos.api'
import { medicamentosApi, Medicamento } from '@/lib/api/medicamentos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { UnidadMedida } from '@ganaderia/shared'

const UNIDAD_OPTIONS = Object.values(UnidadMedida).map(v => ({ value: v, label: v }))

interface FormItem extends CreateTemplateItemInput {
  _key: number
  medicamentoNombre?: string
}

const emptyForm: Omit<CreateTemplateInput, 'items'> = {
  nombre: '',
  descripcion: '',
}

let itemKey = 0

export default function KitsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TratamientoTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TratamientoTemplate | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [items, setItems] = useState<FormItem[]>([])
  const [newItem, setNewItem] = useState<Partial<FormItem>>({
    dosis: 1,
    unidadDosis: UnidadMedida.ML,
  })

  const { data: kits, isLoading } = useQuery({
    queryKey: ['tratamiento-templates'],
    queryFn: tratamientoTemplatesApi.findAll,
  })

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: medicamentosApi.findAll,
  })

  const medicamentoOptions = (medicamentos ?? []).map((m: Medicamento) => ({
    value: m.id,
    label: `${m.nombre} (${m.unidadMedida})`,
  }))

  const createMutation = useMutation({
    mutationFn: tratamientoTemplatesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tratamiento-templates'] })
      toast('success', 'Kit creado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al crear kit'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateInput }) =>
      tratamientoTemplatesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tratamiento-templates'] })
      toast('success', 'Kit actualizado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tratamientoTemplatesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tratamiento-templates'] })
      toast('success', 'Kit desactivado')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al desactivar'),
  })

  function openCreate() {
    setEditTarget(null)
    setForm({ ...emptyForm })
    setItems([])
    setNewItem({ dosis: 1, unidadDosis: UnidadMedida.ML })
    setModalOpen(true)
  }

  function openEdit(kit: TratamientoTemplate) {
    setEditTarget(kit)
    setForm({ nombre: kit.nombre, descripcion: kit.descripcion ?? '' })
    setItems(
      kit.items.map((item, idx) => ({
        _key: idx,
        medicamentoId: item.medicamentoId,
        dosis: item.dosis,
        unidadDosis: item.unidadDosis,
        orden: item.orden,
        medicamentoNombre: item.medicamento.nombre,
      }))
    )
    setNewItem({ dosis: 1, unidadDosis: UnidadMedida.ML })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  function addItem() {
    if (!newItem.medicamentoId || !newItem.dosis || !newItem.unidadDosis) return
    const med = medicamentos?.find((m: Medicamento) => m.id === newItem.medicamentoId)
    itemKey++
    setItems(prev => [
      ...prev,
      {
        _key: itemKey,
        medicamentoId: newItem.medicamentoId!,
        dosis: newItem.dosis!,
        unidadDosis: newItem.unidadDosis!,
        orden: prev.length,
        medicamentoNombre: med?.nombre,
      },
    ])
    setNewItem({ dosis: 1, unidadDosis: UnidadMedida.ML })
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i._key !== key).map((i, idx) => ({ ...i, orden: idx })))
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { toast('error', 'El nombre es obligatorio'); return }
    if (items.length === 0) { toast('error', 'El kit debe tener al menos un medicamento'); return }

    const payload: CreateTemplateInput = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim() || undefined,
      items: items.map((item, idx) => ({
        medicamentoId: item.medicamentoId,
        dosis: item.dosis,
        unidadDosis: item.unidadDosis,
        orden: idx,
      })),
    }

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kits de Tratamiento"
        description="Define protocolos reutilizables de medicamentos y dosis"
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo kit
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : !kits || kits.length === 0 ? (
        <EmptyState
          icon={Syringe}
          title="Sin kits definidos"
          description="Crea un kit con los medicamentos y dosis estándar para tratamientos comunes"
          action={<Button variant="primary" onClick={openCreate}>Crear primer kit</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {kits.map(kit => (
            <div key={kit.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{kit.nombre}</h3>
                    <Badge variant="muted">{kit._count?.aplicaciones ?? 0} aplicaciones</Badge>
                  </div>
                  {kit.descripcion && (
                    <p className="text-sm text-muted-foreground mt-0.5">{kit.descripcion}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(kit)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(kit)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Items del kit */}
              <div className="flex flex-wrap gap-2">
                {kit.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground">{item.medicamento.nombre}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono text-brand">{item.dosis} {item.unidadDosis}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal crear/editar ─────────────────────────────────────────── */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Editar kit' : 'Nuevo kit'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del kit"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Kit Inicial, Kit Resfriado"
          />
          <Input
            label="Descripción (opcional)"
            value={form.descripcion ?? ''}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Protocolo de tratamiento..."
          />

          {/* Items actuales */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Medicamentos del kit
            </label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin medicamentos agregados</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((item, idx) => (
                  <div
                    key={item._key}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-foreground">{item.medicamentoNombre ?? item.medicamentoId}</span>
                    <span className="text-sm font-mono text-brand">{item.dosis} {item.unidadDosis}</span>
                    <button
                      onClick={() => removeItem(item._key)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agregar item */}
          <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Agregar medicamento
            </p>
            <Select
              label="Medicamento"
              value={newItem.medicamentoId ?? ''}
              onChange={e => setNewItem(n => ({ ...n, medicamentoId: e.target.value }))}
              options={[{ value: '', label: 'Selecciona medicamento...' }, ...medicamentoOptions]}
            />
            <div className="flex gap-2">
              <Input
                label="Dosis"
                type="number"
                min={0.001}
                step={0.5}
                value={newItem.dosis ?? ''}
                onChange={e => setNewItem(n => ({ ...n, dosis: Number(e.target.value) }))}
                className="flex-1"
              />
              <Select
                label="Unidad"
                value={newItem.unidadDosis ?? UnidadMedida.ML}
                onChange={e => setNewItem(n => ({ ...n, unidadDosis: e.target.value as UnidadMedida }))}
                options={UNIDAD_OPTIONS}
                className="flex-1"
              />
            </div>
            <Button
              variant="secondary"
              onClick={addItem}
              disabled={!newItem.medicamentoId || !newItem.dosis}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar al kit
            </Button>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando…' : editTarget ? 'Guardar cambios' : 'Crear kit'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── ConfirmDialog eliminar ─────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Desactivar kit"
        description={`¿Desactivar el kit "${deleteTarget?.nombre}"? Los tratamientos históricos no se verán afectados.`}
        confirmLabel="Desactivar"
        variant="danger"
      />
    </div>
  )
}
