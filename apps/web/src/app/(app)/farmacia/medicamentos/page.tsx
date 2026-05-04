'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FlaskConical, AlertTriangle, Pencil, Trash2, ArrowUpFromLine, Sliders } from 'lucide-react'
import { medicamentosApi, CreateMedicamentoInput, MedicamentoConStock } from '@/lib/api/medicamentos.api'
import { inventarioApi } from '@/lib/api/inventario.api'
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
import { FarmaciaSwitcher, SinFarmaciasMensaje, useFarmaciaActiva } from '@/components/farmacia/farmacia-switcher'
import { useAuthStore } from '@/stores/auth.store'
import { PresentacionMedicamento, UnidadMedida, TipoUsuario } from '@ganaderia/shared'
import { formatCurrency } from '@/lib/utils'

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
  const { farmaciaActivaId: farmaciaId, farmaciaActiva, hasAccess, isLoading: loadingFarmacias } = useFarmaciaActiva()
  const { usuario } = useAuthStore()
  const esSuperusuario = usuario?.tipo === TipoUsuario.SUPERUSUARIO
  const qc = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MedicamentoConStock | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MedicamentoConStock | null>(null)
  const [form, setForm] = useState<CreateMedicamentoInput>({ ...emptyForm, farmaciaId })

  // Salida desde fila
  const [salidaTarget, setSalidaTarget] = useState<MedicamentoConStock | null>(null)
  const [salidaForm, setSalidaForm] = useState({ cantidad: '1', medicoId: '', notas: '' })

  // Ajuste desde fila (solo SU)
  const [ajusteTarget, setAjusteTarget] = useState<MedicamentoConStock | null>(null)
  const [ajusteForm, setAjusteForm] = useState({ cantidadNueva: '', costoUnitario: '', justificacion: '' })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.findAll,
    select: (us) => us.filter((u) => u.activo),
    enabled: !!salidaTarget, // solo carga cuando se abre el dialog de salida
  })

  // Mantén farmaciaId del form sincronizado con el switcher
  useEffect(() => {
    if (farmaciaId) setForm((f) => ({ ...f, farmaciaId }))
  }, [farmaciaId])

  const { data: medicamentos, isLoading } = useQuery({
    queryKey: ['medicamentos', farmaciaId],
    queryFn: () => medicamentosApi.findAll(farmaciaId),
    enabled: !!farmaciaId,
  })

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

  const salidaMutation = useMutation({
    mutationFn: () => inventarioApi.crearSalida({
      medicamentoId: salidaTarget!.id,
      cantidad: parseInt(salidaForm.cantidad) || 1,
      medicoId: salidaForm.medicoId,
      notas: salidaForm.notas || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['medicamentos', farmaciaId] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['inventario-salidas'] })
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      const plural = res.cantidad === 1 ? 'unidad entregada' : 'unidades entregadas'
      toast('success', `${res.cantidad} ${plural} de ${res.medicamento.nombre}`)
      setSalidaTarget(null)
      setSalidaForm({ cantidad: '1', medicoId: '', notas: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar salida'),
  })

  const ajusteMutation = useMutation({
    mutationFn: () => inventarioApi.crearAjuste({
      medicamentoId: ajusteTarget!.id,
      cantidadNueva: parseInt(ajusteForm.cantidadNueva),
      costoUnitario: ajusteForm.costoUnitario ? parseFloat(ajusteForm.costoUnitario) : undefined,
      justificacion: ajusteForm.justificacion,
    }),
    onSuccess: (ajuste) => {
      qc.invalidateQueries({ queryKey: ['medicamentos', farmaciaId] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      qc.invalidateQueries({ queryKey: ['inventario-ajustes'] })
      const dir = ajuste.delta > 0 ? '+' : ''
      toast('success', `Stock ajustado: ${ajuste.cantidadAnterior} → ${ajuste.cantidadNueva} (${dir}${ajuste.delta})`)
      setAjusteTarget(null)
      setAjusteForm({ cantidadNueva: '', costoUnitario: '', justificacion: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al ajustar inventario'),
  })

  const openSalida = (med: MedicamentoConStock) => {
    setSalidaTarget(med)
    setSalidaForm({ cantidad: '1', medicoId: '', notas: '' })
  }

  const openAjuste = (med: MedicamentoConStock) => {
    setAjusteTarget(med)
    const stockActual = med.stock.disponibles + med.stock.preIngreso + med.stock.salidas
    setAjusteForm({ cantidadNueva: String(stockActual), costoUnitario: '', justificacion: '' })
  }

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

  if (!loadingFarmacias && !hasAccess) {
    return (
      <div className="space-y-5">
        <PageHeader title="Medicamentos" description="Catálogo de medicamentos por farmacia" />
        <SinFarmaciasMensaje />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medicamentos"
        description={farmaciaActiva ? `Catálogo de ${farmaciaActiva.nombre}` : 'Catálogo de medicamentos'}
        action={
          <div className="flex items-center gap-2">
            <FarmaciaSwitcher />
            <Button onClick={openCreate} disabled={!farmaciaId}>
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
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => openSalida(med)}
                          disabled={med.stock.disponibles + med.stock.preIngreso === 0}
                          title={med.stock.disponibles + med.stock.preIngreso === 0 ? 'Sin stock disponible' : 'Registrar salida'}
                        >
                          <ArrowUpFromLine className="h-3.5 w-3.5" />
                          Salida
                        </Button>
                        {esSuperusuario && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1 text-amber-600"
                            onClick={() => openAjuste(med)}
                            title="Ajustar stock real"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                            Ajuste
                          </Button>
                        )}
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

      {/* Salida desde fila */}
      <Dialog open={!!salidaTarget} onClose={() => setSalidaTarget(null)} title="Registrar salida temporal" size="sm">
        {salidaTarget && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{salidaTarget.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {salidaTarget.stock.disponibles + salidaTarget.stock.preIngreso} unidades disponibles · FIFO (más antigua sale primero)
              </p>
            </div>
            <Input
              label={`Cantidad a entregar * (máx. ${salidaTarget.stock.disponibles + salidaTarget.stock.preIngreso})`}
              type="number"
              step="1"
              min="1"
              max={salidaTarget.stock.disponibles + salidaTarget.stock.preIngreso}
              value={salidaForm.cantidad}
              onChange={(e) => setSalidaForm((f) => ({ ...f, cantidad: e.target.value }))}
              required
            />
            <Select
              label="Médico / Veterinario *"
              value={salidaForm.medicoId}
              onChange={(e) => setSalidaForm((f) => ({ ...f, medicoId: e.target.value }))}
              options={[
                { value: '', label: 'Selecciona médico...' },
                ...(usuarios?.map((u) => ({ value: u.id, label: `${u.nombre} ${u.apellido}` })) ?? []),
              ]}
              required
            />
            <Input
              label="Notas"
              value={salidaForm.notas}
              onChange={(e) => setSalidaForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Indicaciones, animales a tratar..."
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setSalidaTarget(null)}>Cancelar</Button>
              <Button
                loading={salidaMutation.isPending}
                onClick={() => salidaMutation.mutate()}
                disabled={
                  !salidaForm.medicoId ||
                  !salidaForm.cantidad ||
                  parseInt(salidaForm.cantidad) > (salidaTarget.stock.disponibles + salidaTarget.stock.preIngreso)
                }
              >
                Registrar salida
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Ajuste de inventario (SUPERUSUARIO) */}
      <Dialog open={!!ajusteTarget} onClose={() => setAjusteTarget(null)} title="Ajustar inventario" size="sm">
        {ajusteTarget && (() => {
          const stockActual = ajusteTarget.stock.disponibles + ajusteTarget.stock.preIngreso + ajusteTarget.stock.salidas
          const cantidadNuevaNum = parseInt(ajusteForm.cantidadNueva)
          const delta = isNaN(cantidadNuevaNum) ? 0 : cantidadNuevaNum - stockActual
          const requiereCosto = delta > 0
          const stockNoSalido = ajusteTarget.stock.disponibles + ajusteTarget.stock.preIngreso
          const noPuedeBajar = delta < 0 && Math.abs(delta) > stockNoSalido
          return (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/30 px-3 py-2 text-sm space-y-1">
                <p className="font-medium text-foreground">{ajusteTarget.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  Stock actual: <strong className="text-foreground">{stockActual}</strong>
                  {' '}({ajusteTarget.stock.disponibles + ajusteTarget.stock.preIngreso} en almacén · {ajusteTarget.stock.salidas} en campo)
                </p>
              </div>
              <Input
                label="Cantidad real en almacén *"
                type="number"
                step="1"
                min="0"
                value={ajusteForm.cantidadNueva}
                onChange={(e) => setAjusteForm((f) => ({ ...f, cantidadNueva: e.target.value }))}
                required
                hint={
                  delta === 0
                    ? 'Igual al stock actual'
                    : delta > 0
                      ? `Se crearán ${delta} unidades nuevas`
                      : `Se darán de baja ${Math.abs(delta)} unidades (más recientes primero)`
                }
              />
              {requiereCosto && (
                <Input
                  label="Costo unitario para las unidades nuevas (MXN) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={ajusteForm.costoUnitario}
                  onChange={(e) => setAjusteForm((f) => ({ ...f, costoUnitario: e.target.value }))}
                  placeholder="0.00"
                  required
                  hint={
                    parseFloat(ajusteForm.costoUnitario) > 0
                      ? `Costo por ${ajusteTarget.unidadMedida.toLowerCase()}: ${formatCurrency(parseFloat(ajusteForm.costoUnitario) / ajusteTarget.volumenPresentacion)}`
                      : undefined
                  }
                />
              )}
              <Input
                label="Justificación *"
                value={ajusteForm.justificacion}
                onChange={(e) => setAjusteForm((f) => ({ ...f, justificacion: e.target.value }))}
                placeholder="Ej: Conteo físico mensual, frasco roto, etc."
                required
              />
              {noPuedeBajar && (
                <div className="rounded-md bg-danger-subtle border border-danger/30 p-3 text-xs text-danger-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  No puedes bajar a {ajusteForm.cantidadNueva}: solo {stockNoSalido} unidades están en almacén (las demás están entregadas a un médico).
                </div>
              )}
              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                Este ajuste queda registrado en el <strong>historial de ajustes</strong> con tu usuario y fecha.
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => setAjusteTarget(null)}>Cancelar</Button>
                <Button
                  loading={ajusteMutation.isPending}
                  onClick={() => ajusteMutation.mutate()}
                  disabled={
                    !ajusteForm.cantidadNueva ||
                    !ajusteForm.justificacion.trim() ||
                    delta === 0 ||
                    noPuedeBajar ||
                    (requiereCosto && !ajusteForm.costoUnitario)
                  }
                >
                  Aplicar ajuste
                </Button>
              </div>
            </div>
          )
        })()}
      </Dialog>
    </div>
  )
}
