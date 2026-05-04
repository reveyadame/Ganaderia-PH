'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RotateCcw, UtensilsCrossed, Clock, MapPin } from 'lucide-react'
import { scanApi } from '@/lib/api/scan.api'
import { comederoEstadosApi, comederoLecturasApi, EstadoActualCorral } from '@/lib/api/comederos.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { MobilePageHeader } from '@/components/operador/mobile-page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { ScanResultCorral } from '@ganaderia/shared'

type Step = 'scan' | 'seleccion' | 'exito'

export default function ComederoPage() {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('scan')
  const [corralResult, setCorralResult] = useState<ScanResultCorral | null>(null)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(null)
  const [grupoCorralesId, setGrupoCorralesId] = useState('')

  const { data: estados } = useQuery({
    queryKey: ['comedero-estados'],
    queryFn: comederoEstadosApi.findAll,
  })

  const { data: grupos } = useQuery({
    queryKey: ['grupos-corrales'],
    queryFn: gruposCorralesApi.findAll,
  })

  const { data: estadoActual, refetch: refetchDashboard } = useQuery({
    queryKey: ['comedero-estado-actual', grupoCorralesId],
    queryFn: () => comederoLecturasApi.getEstadoActual(grupoCorralesId),
    enabled: !!grupoCorralesId,
  })

  const scanMutation = useMutation({
    mutationFn: (codigo: string) => scanApi.resolve(codigo, 'CORRAL'),
    onSuccess: (result) => {
      if (result.tipo !== 'CORRAL') {
        toast('error', 'Código no corresponde a un corral')
        return
      }
      setCorralResult(result as ScanResultCorral)
      setEstadoSeleccionado(null)
      setStep('seleccion')
    },
    onError: () => toast('error', 'Error al resolver el código'),
  })

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!corralResult || !estadoSeleccionado) throw new Error('Datos incompletos')
      return comederoLecturasApi.registrar({
        corralId: corralResult.corral.id,
        estadoConfigId: estadoSeleccionado,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comedero-estado-actual'] })
      setStep('exito')
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar lectura'),
  })

  function reset() {
    setStep('scan')
    setCorralResult(null)
    setEstadoSeleccionado(null)
  }

  const estadosActivos = estados?.filter(e => e.activo) ?? []
  const grupoOptions = (grupos ?? []).map(g => ({ value: g.id, label: g.nombre }))

  // ── STEP: SCAN ──────────────────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <div className="space-y-6">
        <MobilePageHeader title="Lecturas de comedero" subtitle="Escanea un corral" />
        <BarcodeInput
          onScan={codigo => scanMutation.mutate(codigo)}
          loading={scanMutation.isPending}
          label="Código del corral"
          autoFocus
        />
        <DashboardSection
          grupoOptions={grupoOptions}
          grupoCorralesId={grupoCorralesId}
          setGrupoCorralesId={setGrupoCorralesId}
          estadoActual={estadoActual}
          isLoading={false}
        />
      </div>
    )
  }

  // ── STEP: SELECCIÓN ─────────────────────────────────────────────────────────
  if (step === 'seleccion' && corralResult) {
    const { corral } = corralResult
    return (
      <div className="space-y-5">
        <MobilePageHeader
          title="Estado del comedero"
          back={false}
          action={
            <button
              onClick={reset}
              aria-label="Otro corral"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          }
        />

        <div className="space-y-4">
          {/* Info corral */}
          <div className="rounded-xl border border-border bg-background px-4 py-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-brand" />
              {corral.nombre}
            </div>
            <p className="text-xs text-muted-foreground">
              {corral.grupoCorrales.nombre} · {corral.animalesCount} animales activos
            </p>
            {corral.ultimaLectura && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Última lectura:{' '}
                  <span
                    className="font-medium"
                    style={{ color: corral.ultimaLectura.estadoConfig.color ?? undefined }}
                  >
                    {corral.ultimaLectura.estadoConfig.nombre}
                  </span>
                  {' · '}{formatDateTime(corral.ultimaLectura.fechaLectura)}
                </span>
              </div>
            )}
          </div>

          {/* Botones de estado — máximo 2 taps */}
          {estadosActivos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay estados configurados. El administrador debe crear los estados del comedero.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {estadosActivos.map(estado => (
                <button
                  key={estado.id}
                  onClick={() => setEstadoSeleccionado(estado.id)}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    estadoSeleccionado === estado.id
                      ? 'border-current scale-[1.02] shadow-lg'
                      : 'border-border hover:border-current'
                  }`}
                  style={{
                    color: estado.color ?? '#64748b',
                    backgroundColor: estadoSeleccionado === estado.id
                      ? `${estado.color ?? '#64748b'}18`
                      : undefined,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: estado.color ?? '#64748b' }}
                  />
                  <span className="text-sm font-semibold text-foreground">{estado.nombre}</span>
                </button>
              ))}
            </div>
          )}

          {estadoSeleccionado && (
            <Button
              variant="primary"
              size="xl"
              className="w-full"
              onClick={() => registrarMutation.mutate()}
              disabled={registrarMutation.isPending}
            >
              {registrarMutation.isPending ? 'Registrando…' : 'Confirmar lectura'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── STEP: ÉXITO ─────────────────────────────────────────────────────────────
  if (step === 'exito') {
    const estadoNombre = estados?.find(e => e.id === estadoSeleccionado)?.nombre
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-success/30 bg-success-subtle/60 p-6 text-center space-y-3">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[17px]">Lectura registrada</p>
            {corralResult && (
              <p className="text-[13px] text-muted-foreground">
                {corralResult.corral.nombre} — <span className="font-medium text-foreground">{estadoNombre}</span>
              </p>
            )}
          </div>
        </div>
        <Button variant="primary" size="xl" className="w-full" onClick={reset}>
          <UtensilsCrossed className="h-5 w-5" />
          Registrar otro corral
        </Button>
      </div>
    )
  }

  return null
}

// ── Dashboard de grilla coloreada ─────────────────────────────────────────────

interface DashboardSectionProps {
  grupoOptions: { value: string; label: string }[]
  grupoCorralesId: string
  setGrupoCorralesId: (id: string) => void
  estadoActual: { grupo: { id: string; nombre: string }; corrales: EstadoActualCorral[] } | undefined
  isLoading: boolean
}

function DashboardSection({
  grupoOptions, grupoCorralesId, setGrupoCorralesId, estadoActual,
}: DashboardSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Estado actual por GrupoCorrales
        </h2>
        <div className="w-52">
          <Select
            value={grupoCorralesId}
            onChange={e => setGrupoCorralesId(e.target.value)}
            options={[{ value: '', label: 'Selecciona grupo...' }, ...grupoOptions]}
          />
        </div>
      </div>

      {grupoCorralesId && estadoActual && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {estadoActual.corrales.map(corral => {
            const color = corral.ultimaLectura?.estadoConfig.color
            return (
              <div
                key={corral.id}
                className="rounded-xl border-2 p-3 space-y-1.5 transition-colors"
                style={{
                  borderColor: color ? `${color}60` : undefined,
                  backgroundColor: color ? `${color}10` : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{corral.codigo}</span>
                  {color && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{corral.nombre}</p>
                {corral.ultimaLectura ? (
                  <p
                    className="text-xs font-medium"
                    style={{ color: color ?? undefined }}
                  >
                    {corral.ultimaLectura.estadoConfig.nombre}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin lectura</p>
                )}
                <p className="text-xs text-muted-foreground">{corral.animalesCount} animales</p>
              </div>
            )
          })}
        </div>
      )}

      {grupoCorralesId && !estadoActual && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Cargando estado del grupo…</p>
        </div>
      )}
    </div>
  )
}
