'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Download, FlaskConical, Search, Sliders,
  X, Layers, ArrowUpCircle,
} from 'lucide-react'
import Link from 'next/link'
import { inventarioApi, UnidadMedicamento } from '@/lib/api/inventario.api'
import { usuariosApi } from '@/lib/api/usuarios.api'
import { MedicamentoConStock } from '@/lib/api/medicamentos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { FarmaciaSwitcher, SinFarmaciasMensaje, useFarmaciaActiva } from '@/components/farmacia/farmacia-switcher'
import { useAuthStore } from '@/stores/auth.store'
import { EstadoUnidadMedicamento, TipoBajaMedicamento, TipoUsuario } from '@ganaderia/shared'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

const BAJA_OPTIONS = Object.values(TipoBajaMedicamento).map(v => ({ value: v, label: v.replace('_', ' ') }))
const REQUIEREN_JUSTIFICACION: TipoBajaMedicamento[] = [
  TipoBajaMedicamento.AJUSTE,
  TipoBajaMedicamento.PERDIDA,
  TipoBajaMedicamento.ROBO,
  TipoBajaMedicamento.DANO,
]

function estadoLabel(e: EstadoUnidadMedicamento): string {
  return {
    PRE_INGRESO: 'Pre-ingreso',
    DISPONIBLE: 'Disponible',
    SALIDA_TEMPORAL: 'En campo',
    CONSUMIDO: 'Consumido',
    BAJA: 'Baja',
  }[e]
}

function estadoVariant(e: EstadoUnidadMedicamento): 'success' | 'warning' | 'info' | 'danger' | 'default' {
  return {
    DISPONIBLE: 'success',
    PRE_INGRESO: 'warning',
    SALIDA_TEMPORAL: 'info',
    CONSUMIDO: 'default',
    BAJA: 'danger',
  }[e] as 'success' | 'warning' | 'info' | 'danger' | 'default'
}

export default function InventarioPage() {
  const { farmaciaActivaId: farmaciaId, farmaciaActiva, hasAccess, isLoading: loadingFarmacias } = useFarmaciaActiva()
  const { usuario } = useAuthStore()
  const esSuperusuario = usuario?.tipo === TipoUsuario.SUPERUSUARIO
  const qc = useQueryClient()

  const [search, setSearch] = useState('')

  // Modales
  const [altaTarget, setAltaTarget] = useState<MedicamentoConStock | null>(null)
  const [altaForm, setAltaForm] = useState({ cantidad: '1', costoUnitario: '', notasProveedor: '' })

  const [salidaTarget, setSalidaTarget] = useState<MedicamentoConStock | null>(null)
  const [salidaForm, setSalidaForm] = useState({ cantidad: '1', medicoId: '', notas: '' })

  const [ajusteTarget, setAjusteTarget] = useState<MedicamentoConStock | null>(null)
  const [ajusteForm, setAjusteForm] = useState({ cantidadNueva: '', costoUnitario: '', justificacion: '' })

  const [unidadesTarget, setUnidadesTarget] = useState<MedicamentoConStock | null>(null)
  const [bajaTarget, setBajaTarget] = useState<UnidadMedicamento | null>(null)
  const [bajaForm, setBajaForm] = useState({ tipo: TipoBajaMedicamento.CONSUMO_CAMPO, justificacion: '' })

  const { data: stock, isLoading } = useQuery({
    queryKey: ['inventario-stock', farmaciaId],
    queryFn: () => inventarioApi.getStock(farmaciaId),
    enabled: !!farmaciaId,
  })
  const medicamentos = stock?.medicamentos ?? []

  const medicamentosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return medicamentos
    return medicamentos.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      (m.nombreGenerico?.toLowerCase().includes(q) ?? false) ||
      m.presentacion.toLowerCase().includes(q),
    )
  }, [medicamentos, search])

  const { data: unidadesDelMedicamento, isLoading: loadingUnidades } = useQuery({
    queryKey: ['inventario-unidades', farmaciaId, unidadesTarget?.id],
    queryFn: () => inventarioApi.getUnidades({
      farmaciaId,
      medicamentoId: unidadesTarget!.id,
      limit: 200,
    }),
    enabled: !!unidadesTarget && !!farmaciaId,
  })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.findAll,
    select: (us) => us.filter((u) => u.activo),
    enabled: !!salidaTarget,
  })

  const altaMutation = useMutation({
    mutationFn: () => inventarioApi.altaUnidad({
      medicamentoId: altaTarget!.id,
      farmaciaId,
      cantidad: parseInt(altaForm.cantidad) || 1,
      costoUnitario: parseFloat(altaForm.costoUnitario),
      notasProveedor: altaForm.notasProveedor || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      const plural = res.cantidad === 1 ? 'unidad ingresada' : 'unidades ingresadas'
      toast('success', `${res.cantidad} ${plural} de ${res.medicamento.nombre}`)
      setAltaTarget(null)
      setAltaForm({ cantidad: '1', costoUnitario: '', notasProveedor: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al dar de alta'),
  })

  const salidaMutation = useMutation({
    mutationFn: () => inventarioApi.crearSalida({
      medicamentoId: salidaTarget!.id,
      farmaciaId,
      cantidad: parseInt(salidaForm.cantidad) || 1,
      medicoId: salidaForm.medicoId,
      notas: salidaForm.notas || undefined,
    }),
    onSuccess: (res) => {
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
      farmaciaId,
      cantidadNueva: parseInt(ajusteForm.cantidadNueva),
      costoUnitario: ajusteForm.costoUnitario ? parseFloat(ajusteForm.costoUnitario) : undefined,
      justificacion: ajusteForm.justificacion,
    }),
    onSuccess: (ajuste) => {
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

  const bajaMutation = useMutation({
    mutationFn: () => inventarioApi.registrarBaja({
      unidadMedicamentoId: bajaTarget!.id,
      tipo: bajaForm.tipo,
      justificacion: bajaForm.justificacion || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      toast('success', 'Unidad dada de baja')
      setBajaTarget(null)
      setBajaForm({ tipo: TipoBajaMedicamento.CONSUMO_CAMPO, justificacion: '' })
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar baja'),
  })

  const promoverMutation = useMutation({
    mutationFn: (costoPorMedida: number) => inventarioApi.promoverPreIngreso({
      medicamentoId: unidadesTarget!.id,
      farmaciaId,
      costoPorMedida,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventario-stock'] })
      qc.invalidateQueries({ queryKey: ['inventario-unidades'] })
      toast('success', `${res.promovidas} unidad(es) de ${res.medicamento.nombre} promovidas a Disponible`)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al promover'),
  })

  const openAlta = (med: MedicamentoConStock) => {
    setAltaTarget(med)
    setAltaForm({ cantidad: '1', costoUnitario: '', notasProveedor: '' })
  }
  const openSalida = (med: MedicamentoConStock) => {
    setSalidaTarget(med)
    setSalidaForm({ cantidad: '1', medicoId: '', notas: '' })
  }
  const openAjuste = (med: MedicamentoConStock) => {
    setAjusteTarget(med)
    const stockActual = med.stock.disponibles + med.stock.preIngreso + med.stock.salidas
    setAjusteForm({ cantidadNueva: String(stockActual), costoUnitario: '', justificacion: '' })
  }
  const openUnidades = (med: MedicamentoConStock) => setUnidadesTarget(med)

  const exportarCSV = () => {
    if (!medicamentos.length) return
    const headers = ['Medicamento', 'Genérico', 'Presentación', 'Volumen', 'Unidad', 'Disponibles', 'En campo', 'Pre-ingreso', 'Stock mínimo', 'Alerta']
    const rows = medicamentosFiltrados.map(m => [
      m.nombre,
      m.nombreGenerico ?? '',
      m.presentacion,
      String(m.volumenPresentacion),
      m.unidadMedida,
      String(m.stock.disponibles),
      String(m.stock.salidas),
      String(m.stock.preIngreso),
      String(m.stockMinimo),
      m.alerta ? 'SÍ' : 'NO',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
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
    toast('success', `Exportadas ${rows.length} filas`)
  }

  if (!loadingFarmacias && !hasAccess) {
    return (
      <div className="space-y-5">
        <PageHeader title="Inventario" description="Stock por medicamento y farmacia" />
        <SinFarmaciasMensaje />
      </div>
    )
  }

  const necesitaJustificacion = REQUIEREN_JUSTIFICACION.includes(bajaForm.tipo)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventario"
        description={
          farmaciaActiva
            ? `Stock por medicamento en ${farmaciaActiva.nombre}`
            : 'Stock por medicamento y farmacia'
        }
        action={
          <div className="flex items-center gap-2">
            <FarmaciaSwitcher />
            <Button
              variant="secondary"
              onClick={exportarCSV}
              disabled={!farmaciaId || !medicamentosFiltrados.length}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        }
      />

      {/* Buscador */}
      {!isLoading && medicamentos.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, genérico o presentación..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {medicamentosFiltrados.length} de {medicamentos.length}
          </span>
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : !medicamentos.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={FlaskConical}
            title="Sin medicamentos en el catálogo"
            description="Define los medicamentos en Administración → Catálogo de medicamentos"
            action={
              <Link href="/admin/medicamentos">
                <Button>Ir al catálogo</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Medicamento', 'Presentación', 'Disponibles', 'En campo', 'Pre-ingreso', 'Stock mín.', ''].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {medicamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Ningún medicamento coincide con &ldquo;{search}&rdquo;
                    </td>
                  </tr>
                ) : medicamentosFiltrados.map(med => (
                  <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-foreground">{med.nombre}</p>
                        {med.nombreGenerico && (
                          <p className="text-xs text-muted-foreground">{med.nombreGenerico}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {med.presentacion} · {med.volumenPresentacion} {med.unidadMedida}
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
                      <span className={med.stock.preIngreso > 0 ? 'font-medium text-amber-500' : 'text-muted-foreground'}>
                        {med.stock.preIngreso}
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
                          onClick={() => openAlta(med)}
                          title="Dar de alta unidades"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                          Alta
                        </Button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => openUnidades(med)}
                          title="Ver unidades individuales"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Unidades
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

      {/* Alta de stock */}
      <Dialog open={!!altaTarget} onClose={() => setAltaTarget(null)} title="Alta de unidades" size="sm">
        {altaTarget && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{altaTarget.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {altaTarget.presentacion} · {altaTarget.volumenPresentacion} {altaTarget.unidadMedida}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cantidad"
                type="number"
                step="1"
                min="1"
                max="500"
                value={altaForm.cantidad}
                onChange={e => setAltaForm(f => ({ ...f, cantidad: e.target.value }))}
                required
              />
              <Input
                label="Costo unitario (MXN)"
                type="number"
                step="0.01"
                min="0.01"
                value={altaForm.costoUnitario}
                onChange={e => setAltaForm(f => ({ ...f, costoUnitario: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            {altaForm.costoUnitario && (
              <p className="text-xs text-muted-foreground -mt-2">
                {(() => {
                  const costo = parseFloat(altaForm.costoUnitario)
                  const cant = parseInt(altaForm.cantidad) || 1
                  if (!costo) return null
                  const costoPorMedida = costo / altaTarget.volumenPresentacion
                  const total = costo * cant
                  return `Costo por ${altaTarget.unidadMedida.toLowerCase()}: ${formatCurrency(costoPorMedida)} · Total: ${formatCurrency(total)}`
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
              Si ya hay unidades activas, <strong>todas</strong> las nuevas entrarán como <strong>PRE-INGRESO</strong>. Solo van a DISPONIBLE si no hay ninguna unidad registrada.
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setAltaTarget(null)}>Cancelar</Button>
              <Button
                loading={altaMutation.isPending}
                onClick={() => altaMutation.mutate()}
                disabled={!altaForm.costoUnitario || !altaForm.cantidad}
              >
                Dar de alta
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Salida temporal */}
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
              label={`Cantidad a entregar (máx. ${salidaTarget.stock.disponibles + salidaTarget.stock.preIngreso})`}
              type="number"
              step="1"
              min="1"
              max={salidaTarget.stock.disponibles + salidaTarget.stock.preIngreso}
              value={salidaForm.cantidad}
              onChange={e => setSalidaForm(f => ({ ...f, cantidad: e.target.value }))}
              required
            />
            <Select
              label="Médico / Veterinario"
              value={salidaForm.medicoId}
              onChange={e => setSalidaForm(f => ({ ...f, medicoId: e.target.value }))}
              options={[
                { value: '', label: 'Selecciona médico...' },
                ...(usuarios?.map(u => ({ value: u.id, label: `${u.nombre} ${u.apellido}` })) ?? []),
              ]}
              required
            />
            <Input
              label="Notas"
              value={salidaForm.notas}
              onChange={e => setSalidaForm(f => ({ ...f, notas: e.target.value }))}
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

      {/* Ajuste */}
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
                label="Cantidad real en almacén"
                type="number"
                step="1"
                min="0"
                value={ajusteForm.cantidadNueva}
                onChange={e => setAjusteForm(f => ({ ...f, cantidadNueva: e.target.value }))}
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
                  label="Costo unitario para las unidades nuevas (MXN)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={ajusteForm.costoUnitario}
                  onChange={e => setAjusteForm(f => ({ ...f, costoUnitario: e.target.value }))}
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
                label="Justificación"
                value={ajusteForm.justificacion}
                onChange={e => setAjusteForm(f => ({ ...f, justificacion: e.target.value }))}
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

      {/* Drill-down: unidades individuales del medicamento */}
      <Dialog
        open={!!unidadesTarget}
        onClose={() => setUnidadesTarget(null)}
        title={unidadesTarget ? `Unidades — ${unidadesTarget.nombre}` : 'Unidades'}
        size="lg"
      >
        {unidadesTarget && (
          <div className="space-y-3">
            {/* Batches PRE_INGRESO disponibles para promover */}
            {!loadingUnidades && (() => {
              const allUnidades = unidadesDelMedicamento?.data ?? []
              // Precio de la cohorte activa (primera unidad DISPONIBLE o SALIDA_TEMPORAL)
              const cohortActiva = allUnidades.find(u => u.estado === 'DISPONIBLE' || u.estado === 'SALIDA_TEMPORAL')
              const costoCohortActiva = cohortActiva ? Number(cohortActiva.costoPorMedida) : null

              const piBatches = allUnidades
                .filter(u => u.estado === 'PRE_INGRESO')
                .reduce<Record<string, { count: number; costoPorMedida: number; costoUnitario: number }>>((acc, u) => {
                  const key = String(u.costoPorMedida)
                  if (!acc[key]) acc[key] = { count: 0, costoPorMedida: Number(u.costoPorMedida), costoUnitario: Number(u.costoUnitario) }
                  acc[key].count++
                  return acc
                }, {})
              const batches = Object.values(piBatches)
              if (!batches.length) return null

              return (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    Batches en Pre-ingreso
                  </p>
                  {costoCohortActiva !== null && (
                    <p className="text-xs text-muted-foreground">
                      Cohorte activa:{' '}
                      <strong className="text-foreground">
                        {formatCurrency(costoCohortActiva)}/{unidadesTarget.unidadMedida.toLowerCase()}
                      </strong>
                      {' '}— solo batches al mismo precio pueden promoverse ahora.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {batches.map(batch => {
                      const bloqueado = costoCohortActiva !== null
                        && Math.abs(costoCohortActiva - batch.costoPorMedida) > 0.0001
                      return (
                        <div key={batch.costoPorMedida} className="flex items-center justify-between gap-3 text-xs">
                          <span className={bloqueado ? 'text-muted-foreground' : 'text-foreground'}>
                            <strong>{batch.count}</strong> unidades ·{' '}
                            {formatCurrency(batch.costoUnitario)}/frasco ·{' '}
                            <span className="text-muted-foreground">
                              {formatCurrency(batch.costoPorMedida)}/{unidadesTarget.unidadMedida.toLowerCase()}
                            </span>
                            {bloqueado && (
                              <span className="ml-1 text-warning-foreground italic">
                                — espera a que se agote la cohorte activa
                              </span>
                            )}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs shrink-0"
                            loading={promoverMutation.isPending}
                            disabled={bloqueado}
                            title={
                              bloqueado
                                ? `No se puede promover: hay unidades disponibles a ${formatCurrency(costoCohortActiva!)}/${unidadesTarget.unidadMedida.toLowerCase()}`
                                : 'Promover a Disponible'
                            }
                            onClick={() => promoverMutation.mutate(batch.costoPorMedida)}
                          >
                            Promover
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
            {loadingUnidades ? (
              <TableSkeleton rows={5} cols={5} />
            ) : !unidadesDelMedicamento?.data.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sin unidades registradas para este medicamento.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="border-b border-border">
                      {['Estado', 'Costo unitario', 'Costo / medida', 'Ingreso', 'Ingresado por', ''].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unidadesDelMedicamento.data.map(u => (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5">
                          <Badge variant={estadoVariant(u.estado as EstadoUnidadMedicamento)}>
                            {estadoLabel(u.estado as EstadoUnidadMedicamento)}
                          </Badge>
                          {u.estado === 'SALIDA_TEMPORAL' && u.salidasTemporales[0] && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Dr. {u.salidasTemporales[0].medico.nombre}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{formatCurrency(u.costoUnitario)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatCurrency(u.costoPorMedida)}/{unidadesTarget.unidadMedida.toLowerCase()}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap" title={formatDateTime(u.fechaEntrada)}>
                          {formatDate(u.fechaEntrada)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{u.ingresadoPor.nombre}</td>
                        <td className="px-3 py-2.5">
                          {(u.estado === 'DISPONIBLE' || u.estado === 'PRE_INGRESO') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-red-500 hover:text-red-500"
                              onClick={() => {
                                setBajaTarget(u)
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
            )}
          </div>
        )}
      </Dialog>

      {/* Baja individual */}
      <Dialog open={!!bajaTarget} onClose={() => setBajaTarget(null)} title="Dar de baja unidad" size="sm">
        {bajaTarget && (
          <div className="space-y-4">
            <Select
              label="Tipo de baja"
              value={bajaForm.tipo}
              onChange={e => setBajaForm(f => ({ ...f, tipo: e.target.value as TipoBajaMedicamento }))}
              options={BAJA_OPTIONS}
              required
            />
            <Input
              label={`Justificación${necesitaJustificacion ? '' : ' (opcional)'}`}
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
              <Button variant="secondary" onClick={() => setBajaTarget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                loading={bajaMutation.isPending}
                onClick={() => bajaMutation.mutate()}
                disabled={necesitaJustificacion && !bajaForm.justificacion.trim()}
              >
                Confirmar baja
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
