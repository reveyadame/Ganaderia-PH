'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import { CheckCircle2, Scale, ArrowLeft } from 'lucide-react'
import { racionesApi } from '@/lib/api/raciones.api'
import { racionesCatalogoApi } from '@/lib/api/raciones-catalogo.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { corralesApi } from '@/lib/api/corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'

export default function DefinirRacionPage() {
  const qc = useQueryClient()
  const [step, setStep] = useState<'form' | 'exito'>('form')
  const [grupoCorralesId, setGrupoCorralesId] = useState('')
  const [corralId, setCorralId] = useState('')
  const [catalogoId, setCatalogoId] = useState('')
  const [totalKg, setTotalKg] = useState<number>(50)
  const [mananaKg, setMananaKg] = useState<number>(25)
  const [tardeKg, setTardeKg] = useState<number>(25)
  const [descripcion, setDescripcion] = useState('')
  const [modoManual, setModoManual] = useState(false)

  const { data: grupos } = useQuery({
    queryKey: ['grupos-corrales'],
    queryFn: gruposCorralesApi.findAll,
  })

  const { data: corrales } = useQuery({
    queryKey: ['corrales', grupoCorralesId],
    queryFn: () => corralesApi.findAll(grupoCorralesId),
    enabled: !!grupoCorralesId,
  })

  const { data: catalogo } = useQuery({
    queryKey: ['raciones-catalogo'],
    queryFn: racionesCatalogoApi.findAll,
    select: (xs) => xs.filter((x) => x.activo),
  })

  const { data: racionActual } = useQuery({
    queryKey: ['racion-activa', corralId],
    queryFn: () => racionesApi.getRacionActiva(corralId),
    enabled: !!corralId,
  })

  const crearMutation = useMutation({
    mutationFn: racionesApi.crearRacion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racion-activa', corralId] })
      qc.invalidateQueries({ queryKey: ['comedero-estado-actual'] })
      setStep('exito')
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al definir ración'),
  })

  // Sugerido 50/50 cuando cambia el total (BR-RA-002)
  useEffect(() => {
    if (!modoManual) {
      setMananaKg(totalKg / 2)
      setTardeKg(totalKg / 2)
    }
  }, [totalKg, modoManual])

  function handleMananaChange(val: number) {
    setModoManual(true)
    setMananaKg(val)
    setTardeKg(Math.max(0, totalKg - val))
  }

  function handleTardeChange(val: number) {
    setModoManual(true)
    setTardeKg(val)
    setMananaKg(Math.max(0, totalKg - val))
  }

  function handleSubmit() {
    if (!corralId) { toast('error', 'Selecciona un corral'); return }
    if (!catalogoId) { toast('error', 'Selecciona la ración del catálogo'); return }
    if (mananaKg < 0 || tardeKg < 0) { toast('error', 'Las cantidades deben ser positivas'); return }

    crearMutation.mutate({
      corralId,
      catalogoId,
      cantidadKgManana: mananaKg,
      cantidadKgTarde: tardeKg,
      descripcion: descripcion.trim() || undefined,
    })
  }

  function reset() {
    setStep('form')
    setCorralId('')
    setCatalogoId('')
    setDescripcion('')
    setTotalKg(50)
    setMananaKg(25)
    setTardeKg(25)
    setModoManual(false)
    qc.invalidateQueries({ queryKey: ['racion-activa'] })
  }

  const grupoOptions = (grupos ?? []).map(g => ({ value: g.id, label: g.nombre }))
  const corralOptions = (corrales ?? [])
    .filter(c => c.activo)
    .map(c => ({ value: c.id, label: `${c.nombre} (${c.codigo})` }))
  const catalogoOptions = (catalogo ?? []).map(c => ({ value: c.id, label: c.nombre }))

  const corralSeleccionado = corrales?.find(c => c.id === corralId)
  const catalogoSeleccionado = catalogo?.find(c => c.id === catalogoId)

  if (step === 'exito') {
    return (
      <div className="space-y-6">
        <PageHeader title="Ración definida" />
        <div className="max-w-lg mx-auto space-y-6">
          <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold text-foreground text-lg">{catalogoSeleccionado?.nombre ?? 'Ración guardada'}</p>
            <p className="text-sm text-muted-foreground">
              {corralSeleccionado?.nombre} · Mañana: {mananaKg} kg · Tarde: {tardeKg} kg
            </p>
          </div>
          <Button variant="secondary" className="w-full" onClick={reset}>
            <Scale className="h-4 w-4 mr-2" />
            Definir otra ración
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Definir Ración"
        description="Asigna una ración del catálogo a un corral"
        action={
          <Link href={'/raciones' as Route}>
            <Button variant="secondary" size="md"><ArrowLeft className="h-4 w-4" />Volver</Button>
          </Link>
        }
      />

      <div className="max-w-lg mx-auto space-y-5">
        {/* Selección de corral */}
        <Select
          label="Rancho / GrupoCorrales"
          value={grupoCorralesId}
          onChange={e => { setGrupoCorralesId(e.target.value); setCorralId('') }}
          options={[{ value: '', label: 'Selecciona rancho...' }, ...grupoOptions]}
        />
        <Select
          label="Corral"
          value={corralId}
          onChange={e => setCorralId(e.target.value)}
          options={[{ value: '', label: 'Selecciona corral...' }, ...corralOptions]}
          disabled={!grupoCorralesId}
        />

        {/* Ración actual */}
        {racionActual && corralId && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">
              Ración activa: {racionActual.nombre}
            </p>
            <div className="flex gap-4 text-muted-foreground">
              <span>Mañana: <strong>{Number(racionActual.cantidadKgManana)} kg</strong></span>
              <span>Tarde: <strong>{Number(racionActual.cantidadKgTarde)} kg</strong></span>
            </div>
            {racionActual.descripcion && (
              <p className="text-xs text-muted-foreground mt-1">{racionActual.descripcion}</p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-1">
              Al guardar la nueva ración, esta se cerrará automáticamente.
            </p>
          </div>
        )}

        {/* Ración del catálogo */}
        <div className="space-y-1.5">
          <Select
            label="Ración (del catálogo)"
            value={catalogoId}
            onChange={e => setCatalogoId(e.target.value)}
            options={[{ value: '', label: 'Selecciona ración...' }, ...catalogoOptions]}
            required
          />
          {(catalogo ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay raciones en el catálogo.{' '}
              <Link href={'/admin/raciones-catalogo' as Route} className="text-brand hover:underline">
                Crea una primero
              </Link>
            </p>
          )}
        </div>

        {/* Total kg con sugerencia 50/50 */}
        <div className="space-y-1">
          <Input
            label="Total kg diario"
            type="number"
            min={0}
            step={0.5}
            value={totalKg}
            onChange={e => { setTotalKg(Number(e.target.value)); setModoManual(false) }}
          />
          <p className="text-xs text-muted-foreground">Sugerido 50/50 entre turnos. Ajusta abajo si necesitas.</p>
        </div>

        {/* Distribución mañana/tarde */}
        <div className="rounded-xl border border-border bg-background p-4 space-y-4">
          <p className="text-sm font-medium text-foreground">Distribución por turno</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Input
                label="☀️ Mañana (kg)"
                type="number"
                min={0}
                step={0.5}
                value={mananaKg}
                onChange={e => handleMananaChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Input
                label="🌙 Tarde (kg)"
                type="number"
                min={0}
                step={0.5}
                value={tardeKg}
                onChange={e => handleTardeChange(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Barra visual */}
          {(mananaKg + tardeKg) > 0 && (
            <div className="h-2 rounded-full bg-surface overflow-hidden flex">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(mananaKg / (mananaKg + tardeKg)) * 100}%` }}
              />
              <div className="h-full bg-indigo-400 flex-1" />
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>☀️ {mananaKg} kg</span>
            <span className="font-medium text-foreground">Total: {mananaKg + tardeKg} kg</span>
            <span>🌙 {tardeKg} kg</span>
          </div>

          {modoManual && (
            <button
              className="text-xs text-brand hover:underline"
              onClick={() => { setModoManual(false); setMananaKg(totalKg / 2); setTardeKg(totalKg / 2) }}
            >
              Restablecer a 50/50
            </button>
          )}
        </div>

        <Input
          label="Descripción (opcional)"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej: Aumento por calor, reducción por lluvia..."
        />

        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={!corralId || !catalogoId || crearMutation.isPending}
        >
          {crearMutation.isPending ? 'Guardando…' : 'Definir ración'}
        </Button>
      </div>
    </div>
  )
}
