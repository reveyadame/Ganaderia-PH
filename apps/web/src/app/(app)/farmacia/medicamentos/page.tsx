'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, FlaskConical, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { medicamentosApi, CreateMedicamentoInput, MedicamentoConStock } from '@/lib/api/medicamentos.api'
import { farmaciasApi } from '@/lib/api/farmacias.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  farmaciaId: '',
  nombre: '',
  nombreGenerico: '',
  presentacion: PresentacionMedicamento.FRASCO,
  volumenPresentacion: 100,
  unidadMedida: UnidadMedida.ML,
  stockMinimo: 2,
}

export default function MedicamentosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const farmaciaId = searchParams.get('farmaciaId') ?? ''
  const qc = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MedicamentoConStock | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MedicamentoConStock | null>(null)
  const [form, setForm] = useState<CreateMedicamentoInput>({ ...emptyForm, farmaciaId })

  const { data: farmacias } = useQuery({ queryKey: ['farmacias'], queryFn: farmaciasApi.findAll })
  const { data: medicamentos, isLoading } = useQuery({
    queryKey: ['medicamentos', farmaciaId],
    queryFn: () => medicamentosApi.findAll(farmaciaId),
    enabled: !!farmaciaId,
  })

  const selectedFarmacia = farmacias?.find(f => f.id === farmaciaId)

  const createMutation = useMutation({
    mutationFn: medicamentosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicamentos', farmaciaId] })
      toast('success', 'Medicamento creado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al crear medicamento'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMedicamentoInput> }) =>
      medicamentosApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicamentos', farmaciaId] })
      toast('success', 'Medicamento actualizado')
      closeModal()
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicamentosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicamentos', farmaciaId] })
      toast('success', 'Medicamento desactivado')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al desactivar'),
  })

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...emptyForm, farmaciaId })
    setModalOpen(true)
  }

  const openEdit = (med: MedicamentoConStock) => {
    setEditTarget(med)
    setForm({
      farmaciaId: med.farmaciaId,
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
      const { farmaciaId: _, ...rest } = form
      updateMutation.mutate({ id: editTarget.id, data: rest })
    } else {
      createMutation.mutate(form)
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  if (!farmaciaId) {
    return (
      <div className="space-y-5">
        <PageHeader title="Medicamentos" description="Selecciona una farmacia primero" />
        <Button variant="secondary" onClick={() => router.push('/farmacia')}>
          ← Volver a Farmacia
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medicamentos"
        description={selectedFarmacia ? `Farmacia: ${selectedFarmacia.nombre}` : 'Catálogo de medicamentos'}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/farmacia')}>← Farmacia</Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo medicamento
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : !medicamentos?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={FlaskConical}
            title="Sin medicamentos"
            description="Agrega los medicamentos que maneja esta farmacia"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo medicamento</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Nombre', 'Presentación', 'Volumen', 'Disponibles', 'En campo', 'Stock mín.', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {medicamentos.map(med => (
                  <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">{med.nombre}</p>
                        {med.nombreGenerico && (
                          <p className="text-xs text-muted-foreground">{med.nombreGenerico}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{med.presentacion}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {med.volumenPresentacion} {med.unidadMedida}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={med.stock.disponibles > 0 ? 'font-medium text-green-500' : 'text-muted-foreground'}>
                        {med.stock.disponibles}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={med.stock.salidas > 0 ? 'font-medium text-blue-500' : 'text-muted-foreground'}>
                        {med.stock.salidas}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{med.stockMinimo}</span>
                        {med.alerta && (
                          <Badge variant="warning" className="text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Bajo
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(med)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-500"
                          onClick={() => setDeleteTarget(med)}
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
      )}

      {/* Create / Edit Modal */}
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
            El costo por {form.unidadMedida.toLowerCase()} se calcula automáticamente al dar de alta cada frasco.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" loading={isMutating}>
              {editTarget ? 'Guardar cambios' : 'Crear medicamento'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Desactivar medicamento"
        description={`¿Desactivar "${deleteTarget?.nombre}"? El historial de unidades se conserva.`}
        confirmLabel="Desactivar"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
