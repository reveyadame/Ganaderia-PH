'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Plus, ArrowDownToLine, Download, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { FarmaciaSwitcher, SinFarmaciasMensaje, useFarmaciaActiva } from '@/components/farmacia/farmacia-switcher'
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
  const searchParams = useSearchParams()
  const initialMedId = searchParams.get('medicamentoId') ?? ''
  const { farmaciaActivaId: farmaciaId, farmaciaActiva, hasAccess, isLoading: loadingFarmacias } = useFarmaciaActiva()
  const qc = useQueryClient()

  const [medicamentoId, setMedicamentoId] = useState(initialMedId)
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)

  const [altaOpen, setAltaOpen] = useState(false)
  const [altaForm, setAltaForm] = useState({ medicamentoId: initialMedId, cantidad: '1', costoUnitario: '', notasProveedor: '' })

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
      cantidad: parseInt(altaForm.cantidad) || 1,
      costoUnitario: parseFloat(altaForm.costoUnitario),
      notasProveedor: altaForm.notasProveedor || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['medicamentos'] })
      const plural = res.cantidad === 1 ? 'unidad dada de alta' : 'unidades dadas de alta'
      toast('success', `${res.cantidad} ${plural} de ${res.medicamento.nombre}`)
      setAltaOpen(false)
      setAltaForm({ medicamentoId: medicamentoId, cantidad: '1', costoUnitario: '', notasProveedor: '' })
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
      toast('success', 'Unidad dada de baja')
      setBajaOpen(null)
      setBajaForm({ tipo: TipoBajaMedicamento.CONSUMO_CAMPO, justificacion: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar baja'),
  })

  const medOptions = [
    { value: '', label: 'Todos los medicamentos' },
    ...(medicamentos?.map(m => ({ value: m.id, label: m.nombre })) ?? []),
  ]

  if (!loadingFarmacias && !hasAccess) {
    return (
      <div className="space-y-5">
        <PageHeader title="Inventario" description="Unidades de medicamento por farmacia" />
        <SinFarmaciasMensaje />
      </div>
    )
  }

  const necesitaJustificacion = REQUIEREN_JUSTIFICACION.includes(bajaForm.tipo)

  const exportarCSV = async () => {
    if (!farmaciaId) return
    try {
      // Pide TODAS las páginas (limit alto) para exportar el inventario completo de la farmacia
      const todas = await inventarioApi.getUnidades({
        farmaciaId,
        medicamentoId: medicamentoId || undefined,
        estado: estado || undefined,
        page: 1,
        limit: 5000,
      })
      const headers = [
        'Medicamento', 'Presentación', 'Volumen', 'Unidad medida',
        'Estado', 'Costo unitario', 'Costo por medida',
        'Fecha ingreso', 'Ingresado por', 'Médico (si en campo)', 'Notas proveedor',
      ]
      const rows = todas.data.map((u) => [
        u.medicamento.nombre,
        u.medicamento.presentacion,
        String(u.medicamento.volumenPresentacion),
        u.medicamento.unidadMedida,
        estadoLabel(u.estado as EstadoUnidadMedicamento),
        String(u.costoUnitario),
        String(u.costoPorMedida),
        formatDateTime(u.fechaEntrada),
        u.ingresadoPor.nombre ?? '',
        u.salidasTemporales[0]?.medico.nombre ?? '',
        u.notasProveedor ?? '',
      ])
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      // Prefijo BOM para que Excel detecte UTF-8 correctamente
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fechaStr = new Date().toISOString().split('T')[0]
      const slug = (farmaciaActiva?.nombre ?? 'farmacia').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      a.href = url
      a.download = `inventario-${slug}-${fechaStr}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast('success', `Exportadas ${rows.length} unidades`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al exportar'
      toast('error', msg)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventario"
        description={farmaciaActiva ? `Unidades de ${farmaciaActiva.nombre}` : 'Unidades de medicamento — altas, bajas y seguimiento'}
        action={
          <div className="flex items-center gap-2">
            <FarmaciaSwitcher />
            <Button variant="secondary" onClick={exportarCSV} disabled={!farmaciaId || !unidades?.data.length}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setAltaOpen(true)} disabled={!farmaciaId}>
              <Plus className="h-4 w-4" />
              Alta de unidades
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
      <Dialog open={altaOpen} onClose={() => setAltaOpen(false)} title="Alta de unidades" size="sm">
        <div className="space-y-4">
          <Select
            label="Medicamento *"
            value={altaForm.medicamentoId}
            onChange={e => setAltaForm(f => ({ ...f, medicamentoId: e.target.value }))}
            options={[{ value: '', label: 'Selecciona...' }, ...(medicamentos?.map(m => ({ value: m.id, label: m.nombre })) ?? [])]}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cantidad *"
              type="number"
              step="1"
              min="1"
              max="500"
              value={altaForm.cantidad}
              onChange={e => setAltaForm(f => ({ ...f, cantidad: e.target.value }))}
              required
            />
            <Input
              label="Costo unitario (MXN) *"
              type="number"
              step="0.01"
              min="0.01"
              value={altaForm.costoUnitario}
              onChange={e => setAltaForm(f => ({ ...f, costoUnitario: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          {altaForm.medicamentoId && medicamentos && (
            <p className="text-xs text-muted-foreground -mt-2">
              {(() => {
                const med = medicamentos.find(m => m.id === altaForm.medicamentoId)
                const costo = parseFloat(altaForm.costoUnitario)
                const cant = parseInt(altaForm.cantidad) || 1
                if (!med || !costo) return null
                const costoPorMedida = costo / med.volumenPresentacion
                const total = costo * cant
                return `Costo por ${med.unidadMedida.toLowerCase()}: ${formatCurrency(costoPorMedida)} · Total: ${formatCurrency(total)}`
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
            Si ya hay unidades DISPONIBLES, todas las nuevas entrarán como <strong>PRE-INGRESO</strong>. Si no hay stock activo, una entrará DISPONIBLE y el resto PRE-INGRESO (FIFO).
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setAltaOpen(false)}>Cancelar</Button>
            <Button
              loading={altaMutation.isPending}
              onClick={() => altaMutation.mutate()}
              disabled={!altaForm.medicamentoId || !altaForm.costoUnitario || !altaForm.cantidad}
            >
              Dar de alta
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Baja single Modal (desde fila de la tabla) */}
      <Dialog open={!!bajaOpen} onClose={() => setBajaOpen(null)} title="Registrar baja de unidad" size="sm">
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
