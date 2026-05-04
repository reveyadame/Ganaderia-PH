'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, RotateCcw, Scale, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { scanApi } from '@/lib/api/scan.api'
import { racionesApi } from '@/lib/api/raciones.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { ScanResultCorral } from '@ganaderia/shared'
import { TurnoRacion } from '@ganaderia/shared'

type Step = 'scan' | 'surtido' | 'exito'

function turnoSugerido(): TurnoRacion {
  return new Date().getHours() < 14 ? TurnoRacion.MANANA : TurnoRacion.TARDE
}

export default function SurtirRacionPage() {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('scan')
  const [corralResult, setCorralResult] = useState<ScanResultCorral | null>(null)
  const [turno, setTurno] = useState<TurnoRacion>(turnoSugerido())
  const [cantidadSurtida, setCantidadSurtida] = useState<number>(0)
  const [notas, setNotas] = useState('')
  const [ultimoSurtido, setUltimoSurtido] = useState<{ turno: TurnoRacion; kg: number; diferencia: number | null } | null>(null)

  const scanMutation = useMutation({
    mutationFn: (codigo: string) => scanApi.resolve(codigo, 'CORRAL'),
    onSuccess: (result) => {
      if (result.tipo !== 'CORRAL') {
        toast('error', 'Código no corresponde a un corral')
        return
      }
      const cr = result as ScanResultCorral
      setCorralResult(cr)
      // Preset: cantidad definida del turno sugerido
      const t = turnoSugerido()
      setTurno(t)
      const cantPre = cr.corral.racionActiva
        ? (t === TurnoRacion.MANANA
            ? Number(cr.corral.racionActiva.cantidadKgManana)
            : Number(cr.corral.racionActiva.cantidadKgTarde))
        : 0
      setCantidadSurtida(cantPre)
      setNotas('')
      setStep('surtido')
    },
    onError: () => toast('error', 'Error al resolver el código'),
  })

  const surtirMutation = useMutation({
    mutationFn: racionesApi.registrarSurtido,
    onSuccess: (data) => {
      setUltimoSurtido({
        turno: data.turno,
        kg: Number(data.cantidadSurtida),
        diferencia: data.diferencia !== null ? Number(data.diferencia) : null,
      })
      qc.invalidateQueries({ queryKey: ['comedero-estado-actual'] })
      setStep('exito')
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar surtido'),
  })

  function handleSurtir() {
    if (!corralResult) return
    surtirMutation.mutate({
      corralId: corralResult.corral.id,
      turno,
      cantidadSurtida,
      notas: notas.trim() || undefined,
    })
  }

  function reset() {
    setStep('scan')
    setCorralResult(null)
    setUltimoSurtido(null)
    setTurno(turnoSugerido())
    setCantidadSurtida(0)
    setNotas('')
  }

  // Calcular cantidades del turno seleccionado
  const racion = corralResult?.corral.racionActiva
  const cantDefinidaTurno = racion
    ? (turno === TurnoRacion.MANANA ? Number(racion.cantidadKgManana) : Number(racion.cantidadKgTarde))
    : null
  const diferencia = cantDefinidaTurno !== null ? cantidadSurtida - cantDefinidaTurno : null

  // ── STEP: SCAN ──────────────────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Surtir Ración"
          description="Escanea el corral para registrar el surtido"
        />
        <div className="max-w-lg mx-auto">
          <BarcodeInput
            onScan={codigo => scanMutation.mutate(codigo)}
            loading={scanMutation.isPending}
            label="Código del corral"
            autoFocus
          />
        </div>
      </div>
    )
  }

  // ── STEP: SURTIDO ───────────────────────────────────────────────────────────
  if (step === 'surtido' && corralResult) {
    const { corral } = corralResult
    return (
      <div className="space-y-6">
        <PageHeader
          title="Registrar surtido"
          action={
            <button onClick={reset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" />
              Otro corral
            </button>
          }
        />

        <div className="max-w-lg mx-auto space-y-4">
          {/* Info corral */}
          <div className="rounded-xl border border-border bg-background px-4 py-3 space-y-1">
            <p className="font-semibold text-foreground">{corral.nombre}</p>
            <p className="text-xs text-muted-foreground">{corral.grupoCorrales.nombre} · código: {corral.codigo}</p>
          </div>

          {/* Sin ración activa */}
          {!racion && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Este corral no tiene ración activa. Puedes registrar un surtido sin ración definida.
              </p>
            </div>
          )}

          {/* Ración activa */}
          {racion && (
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Ración activa</p>
              <div className="flex gap-4 text-sm">
                <span className={`font-mono ${turno === TurnoRacion.MANANA ? 'text-brand font-semibold' : 'text-muted-foreground'}`}>
                  ☀️ Mañana: {Number(racion.cantidadKgManana)} kg
                </span>
                <span className={`font-mono ${turno === TurnoRacion.TARDE ? 'text-brand font-semibold' : 'text-muted-foreground'}`}>
                  🌙 Tarde: {Number(racion.cantidadKgTarde)} kg
                </span>
              </div>
              {racion.descripcion && (
                <p className="text-xs text-muted-foreground">{racion.descripcion}</p>
              )}
            </div>
          )}

          {/* Selector de turno */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Turno</label>
            <div className="flex gap-2">
              {([TurnoRacion.MANANA, TurnoRacion.TARDE] as TurnoRacion[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setTurno(t)
                    if (racion) {
                      setCantidadSurtida(
                        t === TurnoRacion.MANANA
                          ? Number(racion.cantidadKgManana)
                          : Number(racion.cantidadKgTarde)
                      )
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    turno === t
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === TurnoRacion.MANANA ? '☀️ Mañana' : '🌙 Tarde'}
                  {turnoSugerido() === t && (
                    <span className="ml-1.5 text-xs opacity-60">(sugerido)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad surtida */}
          <div className="space-y-1">
            <Input
              label="Cantidad surtida (kg)"
              type="number"
              min={0}
              step={0.5}
              value={cantidadSurtida}
              onChange={e => setCantidadSurtida(Number(e.target.value))}
            />
            {cantDefinidaTurno !== null && (
              <p className="text-xs text-muted-foreground">
                Definido: {cantDefinidaTurno} kg
                {diferencia !== null && diferencia !== 0 && (
                  <span className={diferencia > 0 ? 'text-amber-500 ml-2' : 'text-red-500 ml-2'}>
                    ({diferencia > 0 ? '+' : ''}{diferencia.toFixed(1)} kg)
                  </span>
                )}
              </p>
            )}
          </div>

          <Input
            label="Notas (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones del surtido..."
          />

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSurtir}
            disabled={surtirMutation.isPending}
          >
            <Scale className="h-4 w-4 mr-2" />
            {surtirMutation.isPending ? 'Registrando…' : 'Confirmar surtido'}
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP: ÉXITO ─────────────────────────────────────────────────────────────
  if (step === 'exito') {
    return (
      <div className="space-y-6">
        <PageHeader title="Surtido registrado" />
        <div className="max-w-lg mx-auto space-y-6">
          <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold text-foreground text-lg">Surtido registrado</p>
            {corralResult && ultimoSurtido && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{corralResult.corral.nombre}</p>
                <p>
                  {ultimoSurtido.turno === TurnoRacion.MANANA ? '☀️ Mañana' : '🌙 Tarde'}
                  {' · '}<strong className="text-foreground">{ultimoSurtido.kg} kg surtidos</strong>
                </p>
                {ultimoSurtido.diferencia !== null && (
                  <p className={ultimoSurtido.diferencia > 0 ? 'text-amber-500' : ultimoSurtido.diferencia < 0 ? 'text-red-500' : 'text-green-500'}>
                    Diferencia: {ultimoSurtido.diferencia > 0 ? '+' : ''}{ultimoSurtido.diferencia.toFixed(1)} kg
                  </p>
                )}
              </div>
            )}
          </div>
          <Button variant="secondary" className="w-full" onClick={reset}>
            <Scale className="h-4 w-4 mr-2" />
            Surtir otro corral
          </Button>
        </div>
      </div>
    )
  }

  return null
}
