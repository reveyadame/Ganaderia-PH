'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FlaskConical, Pencil, Trash2, Search } from 'lucide-react'
import { medicamentosApi, Medicamento, CreateMedicamentoInput } from '@/lib/api/medicamentos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { PresentacionMedicamento, UnidadMedida } from '@ganaderia/shared'

const PRESENTACION_OPTIONS = Object.values(PresentacionMedicamento).map(v => ({ value: v, label: v }))
const UNIDAD_OPTIONS = Object.values(UnidadMedida).map(v => ({ value: v, label: v }))

const emptyForm: CreateMedicamentoInput = {
  nombre: '',
  nombreGenerico: '',
  presentacion: PresentacionMedicamento.FRASCO,
  volumenPresentacion: 100,
  unidadMedida: UnidadMedida.ML,
  stockMinimo: 2,
}

export default function CatalogoMedicamentosPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Medicamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Medicamento | null>(null)
  const [form, setForm] = useState<CreateMedicamentoInput>(emptyForm)
  const [search, setSearch] = useState('')

  const { data: medicamentos, isLoading } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: medicamentosApi.findAll,
  })

  const medicamentosFiltrados = useMemo(() => {
    const list = medicamentos ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      (m.nombreGenerico?.toLowerCase().includes(q) ?? false) ||
      m.presentacion.toLowerCase().includes(q),
    )
  }, [medicamentos, search])

  const createMutation = useMutation({
    mutationFn: medicamentosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      toast('success', 'Medicamento creado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al crear medicamento'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMedicamentoInput> }) =>
      medicamentosApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      toast('success', 'Medicamento actualizado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicamentosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      toast('success', 'Medicamento desactivado')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al desactivar'),
  })

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (med: Medicamento) => {
    setEditTarget(med)
    setForm({
      nombre: med.nombre,
      nombreGenerico: med.nombreGenerico ?? '',
      presentacion: med.presentacion,
      volumenPresentacion: med.volumenPresentacion,
      unidadMedida: med.unidadMedida,
      stockMinimo: med.stockMinimo,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditTarget(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogo de medicamentos"
        description="Define los medicamentos de la organización. El stock y costo se manejan por farmacia."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo medicamento
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !medicamentos?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={FlaskConical}
            title="Sin medicamentos en el catálogo"
            description="Agrega los medicamentos que maneja la organización"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo medicamento</Button>}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, genérico o presentación..."
                className="pl-9"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {medicamentosFiltrados.length} de {medicamentos.length}
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Nombre comercial', 'Genérico', 'Presentación', 'Volumen', 'Stock mín.', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {medicamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Ningún medicamento coincide con "{search}"
                      </td>
                    </tr>
                  ) : medicamentosFiltrados.map(med => (
                  <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{med.nombre}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{med.nombreGenerico ?? '—'}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{med.presentacion}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {med.volumenPresentacion} {med.unidadMedida}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{med.stockMinimo}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(med)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-500"
                          onClick={() => setDeleteTarget(med)}
                          title="Desactivar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Editar medicamento' : 'Nuevo medicamento'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre comercial *"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Penicilina G Procaínica"
            required
          />
          <Input
            label="Nombre genérico"
            value={form.nombreGenerico ?? ''}
            onChange={e => setForm(f => ({ ...f, nombreGenerico: e.target.value }))}
            placeholder="Ej: Bencilpenicilina"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Presentación *"
              value={form.presentacion}
              onChange={e => setForm(f => ({ ...f, presentacion: e.target.value as PresentacionMedicamento }))}
              options={PRESENTACION_OPTIONS}
              required
            />
            <Select
              label="Unidad de medida *"
              value={form.unidadMedida}
              onChange={e => setForm(f => ({ ...f, unidadMedida: e.target.value as UnidadMedida }))}
              options={UNIDAD_OPTIONS}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Volumen por presentación (${form.unidadMedida}) *`}
              type="number"
              step="0.001"
              min="0.001"
              value={form.volumenPresentacion}
              onChange={e => setForm(f => ({ ...f, volumenPresentacion: parseFloat(e.target.value) }))}
              required
            />
            <Input
              label="Stock mínimo (unidades) *"
              type="number"
              min="0"
              step="1"
              value={form.stockMinimo}
              onChange={e => setForm(f => ({ ...f, stockMinimo: parseInt(e.target.value) }))}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            El costo por {form.unidadMedida.toLowerCase()} se calcula al dar de alta cada frasco en cada farmacia.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={isMutating}>
              {editTarget ? 'Guardar cambios' : 'Crear medicamento'}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Desactivar medicamento"
        description={`¿Desactivar "${deleteTarget?.nombre}"? El historial de unidades y stock existente se conserva.`}
        confirmLabel="Desactivar"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
