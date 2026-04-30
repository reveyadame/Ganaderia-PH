'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, ArrowDownToLine, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { inventarioApi } from '@/lib/api/inventario.api'
import { medicamentosApi } from '@/lib/api/medicamentos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EstadoUnidadMedicamento, TipoBajaMedicamento } from '@ganaderia/shared'

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...Object.values(EstadoUnidadMedicamento).map(v => ({ value: v, label: estadoLabel(v) })),
]

const BAJA_OPTIONS = Object.values(TipoBajaMedicamento).map(v => ({ value: v, label: v.replace('_', ' ') }))
const REQUIEREN_JUSTIFICACION = [TipoBajaMedicamento.AJUSTE, TipoBajaMedicamento.PERDIDA, TipoBajaMedicamento.ROBO, TipoBajaMedicamento.DANO]

function estadoLabel(e: EstadoUnidadMedicamento): string {
  const map: Record<EstadoUnidadMedicamento, string> = {
    PRE_INGRESO: 'Pre-ingreso',
    DISPONIBLE: 'Disponible',
    SALIDA_TEMPORAL: 'En campo',
    CONSUMIDO: 'Consumido',
    BAJA: 'Baja',
  }
  return map[e]
}

function estadoVariant(e: EstadoUnidadMedicamento): 'success' | 'warning' | 'info' | 'danger' | 'default' {
  const map: Record<EstadoUnidadMedicamento, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
    DISPONIBLE: 'success',
    PRE_INGRESO: 'warning',
    SALIDA_TEMPORAL: 'info',
    CONSUMIDO: 'default',
    BAJA: 'danger',
  }
  return map[e]
}

export default function InventarioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const farmaciaId = searchParams.get('farmaciaId') ?? ''
  const initialMedId = searchParams.get('medicamentoId') ?? ''
  const qc = useQueryClient()

  const [medicamentoId, setMedicamentoId] = useState(initialMedId)
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)

  const [altaOpen, setAltaOpen] = useState(false)
  const [altaForm, setAltaForm] = useState({ medicamentoId: initialMedId, costoUnitario: '', notasProveedor: '' })

  const [bajaOpen, setBajaOpen] = useState<string | null>(null)
  const [bajaForm, setBajaForm] = useState({ tipo: TipoBajaMedicamento.CONSUMO_CAMPO, justificacion: '' })

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos', farmaciaId],
    queryFn: () => medicamentosApi.findAll(farmaciaId),
    enabled: !!farmaciaId,
  })

  const { data: unidades, isLoading } = useQuery({
    queryKey: ['inventario-unidades', farmaciaId, medicamentoId, estado, page],
    queryFn: () => inventarioApi.getUnidades({ farmaciaId, medicamentoId: medicamentoId || undefined, estado: estado || undefined, page }),
    enabled: !!farmaciaId,
  })

  const altaMutation = useMutation({
    mutationFn: () => inventarioApi.altaUnidad({
      medicamentoId: altaForm.medicamentoId,
      costoUnitario: parseFloat(altaForm.costoUnitario),
      notasProveedor: altaForm.notasProveedor || undefined,
    }),
    onSuccess: (unidad) => {
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      const estadoIngreso = unidad.estado === 'PRE_INGRESO' ? 'PRE-INGRESO (hay stock existente)' : 'DISPONIBLE'
      toast('success', `Unidad dada de alta como ${estadoIngreso}`)
      setAltaOpen(false)
      setAltaForm({ medicamentoId: medicamentoId, costoUnitario: '', notasProveedor: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al dar de alta'),
  })

  const bajaMutation = useMutation({
    mutationFn: (unidadId: string) => inventarioApi.registrarBaja({
      unidadMedicamentoId: unidadId,
      tipo: bajaForm.tipo,
      justificacion: bajaForm.justificacion || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      toast('success', 'Baja registrada')
      setBajaOpen(null)
      setBajaForm({ tipo: TipoBajaMedicamento.CONSUMO_CAMPO, justificacion: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar baja'),
  })

  const medOptions = [
    { value: '', label: 'Todos los medicamentos' },
    ...(medicamentos?.map(m => ({ value: m.id, label: m.nombre })) ?? []),
  ]

  if (!farmaciaId) {
    return (
      <div className="space-y-5">
        <PageHeader title="Inventario" description="Selecciona una farmacia primero" />
        <Button variant="secondary" onClick={() => router.push('/farmacia')}>← Volver a Farmacia</Button>
      </div>
    )
  }

  const necesitaJustificacion = REQUIEREN_JUSTIFICACION.includes(bajaForm.tipo)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventario"
        description="Unidades de medicamento — altas, bajas y seguimiento"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/farmacia')}>← Farmacia</Button>
            <Button onClick={() => setAltaOpen(true)}>
              <Plus className="h-4 w-4" />
              Alta de unidad
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={medOptions}
          value={medicamentoId}
          onChange={e => { setMedicamentoId(e.target.value); setPage(1) }}
          className="w-52"
        />
        <Select
          options={ESTADO_OPTIONS}
          value={estado}
          onChange={e => { setEstado(e.target.value); setPage(1) }}
          className="w-40"
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : !unidades?.data.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={ArrowDownToLine}
            title="Sin unidades"
            description="Da de alta la primera unidad para comenzar"
            action={<Button onClick={() => setAltaOpen(true)}><Plus className="h-4 w-4" />Alta de unidad</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Medicamento', 'Estado', 'Costo unitario', 'Costo / medida', 'Ingreso', 'Ingresado por', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {unidades.data.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">{u.medicamento.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.medicamento.volumenPresentacion} {u.medicamento.unidadMedida} · {u.medicamento.presentacion}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={estadoVariant(u.estado as EstadoUnidadMedicamento)}>
                        {estadoLabel(u.estado as EstadoUnidadMedicamento)}
                      </Badge>
                      {u.estado === 'SALIDA_TEMPORAL' && u.salidasTemporales[0] && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Dr. {u.salidasTemporales[0].medico.nombre}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{formatCurrency(u.costoUnitario)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {formatCurrency(u.costoPorMedida)}/{u.medicamento.unidadMedida.toLowerCase()}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(u.fechaEntrada)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {u.ingresadoPor.nombre}
                    </td>
                    <td className="px-4 py-3.5">
                      {u.estado === 'DISPONIBLE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-500 hover:text-red-500"
                          onClick={() => {
                            setBajaOpen(u.id)
                            setBajaForm({ tipo: TipoBajaMedicamento.CONSUMO_CAMPO, justificacion: '' })
                          }}
                        >
                          Dar de baja
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(unidades?.totalPages ?? 0) > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Página {unidades.page} de {unidades.totalPages} · {unidades.total} unidades</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={page >= (unidades?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alta Modal */}
      <Dialog open={altaOpen} onClose={() => setAltaOpen(false)} title="Alta de unidad" size="sm">
        <div className="space-y-4">
          <Select
            label="Medicamento *"
            value={altaForm.medicamentoId}
            onChange={e => setAltaForm(f => ({ ...f, medicamentoId: e.target.value }))}
            options={[{ value: '', label: 'Selecciona...' }, ...(medicamentos?.map(m => ({ value: m.id, label: m.nombre })) ?? [])]}
            required
          />
          <Input
            label="Costo de adquisición (MXN) *"
            type="number"
            step="0.01"
            min="0.01"
            value={altaForm.costoUnitario}
            onChange={e => setAltaForm(f => ({ ...f, costoUnitario: e.target.value }))}
            placeholder="0.00"
            required
          />
          {altaForm.medicamentoId && medicamentos && (
            <p className="text-xs text-muted-foreground -mt-2">
              {(() => {
                const med = medicamentos.find(m => m.id === altaForm.medicamentoId)
                const costo = parseFloat(altaForm.costoUnitario)
                if (!med || !costo) return null
                const costoPorMedida = costo / med.volumenPresentacion
                return `Costo por ${med.unidadMedida.toLowerCase()}: ${formatCurrency(costoPorMedida)}`
              })()}
            </p>
          )}
          <Input
            label="Notas del proveedor"
            value={altaForm.notasProveedor}
            onChange={e => setAltaForm(f => ({ ...f, notasProveedor: e.target.value }))}
            placeholder="Lote, proveedor, fecha caducidad..."
          />
          <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
            Si ya hay unidades DISPONIBLES de este medicamento, esta unidad entrará como <strong>PRE-INGRESO</strong> hasta que se agote el stock actual.
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setAltaOpen(false)}>Cancelar</Button>
            <Button
              loading={altaMutation.isPending}
              onClick={() => altaMutation.mutate()}
              disabled={!altaForm.medicamentoId || !altaForm.costoUnitario}
            >
              Dar de alta
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Baja Modal */}
      <Dialog open={!!bajaOpen} onClose={() => setBajaOpen(null)} title="Registrar baja" size="sm">
        <div className="space-y-4">
          <Select
            label="Tipo de baja *"
            value={bajaForm.tipo}
            onChange={e => setBajaForm(f => ({ ...f, tipo: e.target.value as TipoBajaMedicamento }))}
            options={BAJA_OPTIONS}
            required
          />
          <Input
            label={`Justificación${necesitaJustificacion ? ' *' : ''}`}
            value={bajaForm.justificacion}
            onChange={e => setBajaForm(f => ({ ...f, justificacion: e.target.value }))}
            placeholder="Describe la razón de la baja..."
            required={necesitaJustificacion}
          />
          {necesitaJustificacion && (
            <p className="text-xs text-amber-500 -mt-2">
              Requerida para {bajaForm.tipo.replace('_', ' ')}.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setBajaOpen(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              loading={bajaMutation.isPending}
              onClick={() => bajaOpen && bajaMutation.mutate(bajaOpen)}
              disabled={necesitaJustificacion && !bajaForm.justificacion.trim()}
            >
              Confirmar baja
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
