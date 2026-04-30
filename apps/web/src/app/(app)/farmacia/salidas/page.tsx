'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, ArrowUpFromLine, ChevronLeft, ChevronRight, CheckCircle, Package } from 'lucide-react'
import { inventarioApi } from '@/lib/api/inventario.api'
import { medicamentosApi } from '@/lib/api/medicamentos.api'
import { usuariosApi } from '@/lib/api/usuarios.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { EstadoRegreso } from '@ganaderia/shared'

export default function SalidasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const farmaciaId = searchParams.get('farmaciaId') ?? ''
  const qc = useQueryClient()

  const [filtroAbierta, setFiltroAbierta] = useState<string>('true')
  const [page, setPage] = useState(1)

  const [nuevaSalidaOpen, setNuevaSalidaOpen] = useState(false)
  const [salidaForm, setSalidaForm] = useState({
    medicamentoId: '',
    unidadMedicamentoId: '',
    medicoId: '',
    notas: '',
  })

  const [regresoOpen, setRegresoOpen] = useState<string | null>(null)
  const [regresoForm, setRegresoForm] = useState({ estadoRegreso: EstadoRegreso.REGRESO_VACIO, notas: '' })

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos', farmaciaId],
    queryFn: () => medicamentosApi.findAll(farmaciaId),
    enabled: !!farmaciaId,
    select: meds => meds.filter(m => m.stock.disponibles > 0),
  })

  const { data: unidadesDisponibles } = useQuery({
    queryKey: ['inventario-unidades-disp', farmaciaId, salidaForm.medicamentoId],
    queryFn: () => inventarioApi.getUnidades({
      farmaciaId,
      medicamentoId: salidaForm.medicamentoId,
      estado: 'DISPONIBLE',
      limit: 100,
    }),
    enabled: !!farmaciaId && !!salidaForm.medicamentoId,
  })

  const { data: salidas, isLoading } = useQuery({
    queryKey: ['inventario-salidas', farmaciaId, filtroAbierta, page],
    queryFn: () => inventarioApi.getSalidas({
      farmaciaId,
      abierta: filtroAbierta === '' ? undefined : filtroAbierta === 'true',
      page,
    }),
    enabled: !!farmaciaId,
  })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.findAll,
    select: users => users.filter(u => u.activo),
  })

  const crearSalidaMutation = useMutation({
    mutationFn: () => inventarioApi.crearSalida({
      unidadMedicamentoId: salidaForm.unidadMedicamentoId,
      medicoId: salidaForm.medicoId,
      notas: salidaForm.notas || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario-salidas'] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      toast('success', 'Salida temporal registrada')
      setNuevaSalidaOpen(false)
      setSalidaForm({ medicamentoId: '', unidadMedicamentoId: '', medicoId: '', notas: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar salida'),
  })

  const regresoMutation = useMutation({
    mutationFn: (salidaId: string) => inventarioApi.registrarRegreso(salidaId, {
      estadoRegreso: regresoForm.estadoRegreso,
      notas: regresoForm.notas || undefined,
    }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['inventario-salidas'] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      const msg = regresoForm.estadoRegreso === EstadoRegreso.REGRESO_VACIO
        ? 'Frasco consumido — unidad marcada como CONSUMIDO'
        : 'Frasco regresó con contenido — vuelve a DISPONIBLE'
      toast('success', msg)
      setRegresoOpen(null)
      setRegresoForm({ estadoRegreso: EstadoRegreso.REGRESO_VACIO, notas: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar regreso'),
  })

  const medOptions = [
    { value: '', label: 'Selecciona medicamento...' },
    ...(medicamentos?.map(m => ({ value: m.id, label: `${m.nombre} (${m.stock.disponibles} disp.)` })) ?? []),
  ]

  const unidadOptions = [
    { value: '', label: 'Selecciona unidad...' },
    ...(unidadesDisponibles?.data.map(u => ({
      value: u.id,
      label: `Ingreso: ${new Date(u.fechaEntrada).toLocaleDateString('es-MX')} · $${u.costoUnitario}`,
    })) ?? []),
  ]

  const medicoOptions = [
    { value: '', label: 'Selecciona médico...' },
    ...(usuarios?.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` })) ?? []),
  ]

  if (!farmaciaId) {
    return (
      <div className="space-y-5">
        <PageHeader title="Salidas temporales" description="Selecciona una farmacia primero" />
        <Button variant="secondary" onClick={() => router.push('/farmacia')}>← Volver a Farmacia</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salidas temporales"
        description="Unidades entregadas a médicos en campo"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/farmacia')}>← Farmacia</Button>
            <Button onClick={() => setNuevaSalidaOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva salida
            </Button>
          </div>
        }
      />

      {/* Filtro abierta/cerrada */}
      <div className="flex gap-2">
        {[
          { value: 'true', label: 'Abiertas' },
          { value: 'false', label: 'Cerradas' },
          { value: '', label: 'Todas' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => { setFiltroAbierta(opt.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filtroAbierta === opt.value
                ? 'bg-brand text-brand-foreground'
                : 'bg-surface text-muted-foreground border border-border hover:bg-muted/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {salidas && <span className="text-sm text-muted-foreground self-center">{salidas.total} registros</span>}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : !salidas?.data.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={ArrowUpFromLine}
            title="Sin salidas"
            description={filtroAbierta === 'true' ? 'No hay salidas temporales abiertas' : 'Sin salidas registradas'}
            action={
              filtroAbierta === 'true'
                ? <Button onClick={() => setNuevaSalidaOpen(true)}><Plus className="h-4 w-4" />Nueva salida</Button>
                : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Medicamento', 'Médico', 'Salida', 'Regreso', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salidas.data.map(s => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{s.unidadMedicamento.medicamento.nombre}</p>
                      <p className="text-xs text-muted-foreground">{s.unidadMedicamento.medicamento.presentacion}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-foreground">{s.medico.nombre}</p>
                      <p className="text-xs text-muted-foreground">{s.medico.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(s.fechaSalida)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {s.fechaRegreso ? formatDateTime(s.fechaRegreso) : <span className="text-amber-500">Pendiente</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {!s.fechaRegreso ? (
                        <Badge variant="info">En campo</Badge>
                      ) : s.estadoRegreso === EstadoRegreso.REGRESO_VACIO ? (
                        <Badge variant="default">Consumido</Badge>
                      ) : (
                        <Badge variant="success">Con contenido</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {!s.fechaRegreso && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setRegresoOpen(s.id)
                            setRegresoForm({ estadoRegreso: EstadoRegreso.REGRESO_VACIO, notas: '' })
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Registrar regreso
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(salidas?.totalPages ?? 0) > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Página {salidas.page} de {salidas.totalPages} · {salidas.total} registros</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={page >= (salidas?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nueva Salida Modal */}
      <Dialog open={nuevaSalidaOpen} onClose={() => setNuevaSalidaOpen(false)} title="Nueva salida temporal" size="md">
        <div className="space-y-4">
          <Select
            label="Medicamento *"
            value={salidaForm.medicamentoId}
            onChange={e => setSalidaForm(f => ({ ...f, medicamentoId: e.target.value, unidadMedicamentoId: '' }))}
            options={medOptions}
            required
          />
          {salidaForm.medicamentoId && (
            <Select
              label="Unidad a entregar *"
              value={salidaForm.unidadMedicamentoId}
              onChange={e => setSalidaForm(f => ({ ...f, unidadMedicamentoId: e.target.value }))}
              options={unidadOptions}
              required
            />
          )}
          <Select
            label="Médico / Veterinario *"
            value={salidaForm.medicoId}
            onChange={e => setSalidaForm(f => ({ ...f, medicoId: e.target.value }))}
            options={medicoOptions}
            required
          />
          <Input
            label="Notas"
            value={salidaForm.notas}
            onChange={e => setSalidaForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Indicaciones, animales a tratar..."
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setNuevaSalidaOpen(false)}>Cancelar</Button>
            <Button
              loading={crearSalidaMutation.isPending}
              onClick={() => crearSalidaMutation.mutate()}
              disabled={!salidaForm.unidadMedicamentoId || !salidaForm.medicoId}
            >
              Registrar salida
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Regreso Modal */}
      <Dialog open={!!regresoOpen} onClose={() => setRegresoOpen(null)} title="Registrar regreso de unidad" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: EstadoRegreso.REGRESO_VACIO, label: 'Frasco vacío', desc: 'Se marcará como CONSUMIDO', icon: <Package className="h-6 w-6" /> },
              { value: EstadoRegreso.REGRESO_CON_CONTENIDO, label: 'Con contenido', desc: 'Vuelve a DISPONIBLE', icon: <CheckCircle className="h-6 w-6" /> },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setRegresoForm(f => ({ ...f, estadoRegreso: opt.value }))}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-center ${
                  regresoForm.estadoRegreso === opt.value
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-border text-muted-foreground hover:border-brand/40'
                }`}
              >
                {opt.icon}
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <Input
            label="Notas"
            value={regresoForm.notas}
            onChange={e => setRegresoForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observaciones del regreso..."
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setRegresoOpen(null)}>Cancelar</Button>
            <Button
              loading={regresoMutation.isPending}
              onClick={() => regresoOpen && regresoMutation.mutate(regresoOpen)}
            >
              Confirmar regreso
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
