'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PawPrint, MapPin, ChevronRight, Check } from 'lucide-react'
import { MobilePageHeader } from '@/components/operador/mobile-page-header'
import { animalesApi, CreateAnimalInput } from '@/lib/api/animales.api'
import { aretesApi } from '@/lib/api/aretes.api'
import { corralesApi } from '@/lib/api/corrales.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { SexoAnimal } from '@ganaderia/shared'

const SEXO_OPTIONS = [
  { value: SexoAnimal.MACHO, label: '♂ Macho' },
  { value: SexoAnimal.HEMBRA, label: '♀ Hembra' },
]

type Step = 'ubicacion' | 'datos'

export default function NuevoAnimalPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  const filtraPorGrupos = (usuario?.gruposCorralesIds.length ?? 0) > 0

  const [step, setStep] = useState<Step>('ubicacion')
  const [grupoCorralesId, setGrupoCorralesId] = useState('')
  const [corralId, setCorralId] = useState('')

  const [form, setForm] = useState({
    areteSiniiga: '',
    areteBlancoId: '',
    sexo: SexoAnimal.MACHO as SexoAnimal,
    pesoEntrada: '',
    fechaEntrada: new Date().toISOString().split('T')[0],
    loteId: '',
    notas: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [siniigaFromScan, setSiniigaFromScan] = useState(false)

  const { data: grupos } = useQuery({ queryKey: ['grupos-corrales'], queryFn: gruposCorralesApi.findAll })
  const { data: corrales } = useQuery({
    queryKey: ['corrales', grupoCorralesId],
    queryFn: () => corralesApi.findAll(grupoCorralesId),
    enabled: !!grupoCorralesId,
  })
  const { data: aretesDisponibles } = useQuery({
    queryKey: ['aretes-disponibles'],
    queryFn: aretesApi.getDisponibles,
  })
  const { data: lotes } = useQuery({
    queryKey: ['lotes'],
    queryFn: animalesApi.findAllLotes,
  })

  const gruposVisibles = useMemo(() => {
    const activos = (grupos ?? []).filter((g) => g.activo)
    if (!filtraPorGrupos) return activos
    return activos.filter((g) => usuario!.gruposCorralesIds.includes(g.id))
  }, [grupos, filtraPorGrupos, usuario])

  const corralesVisibles = useMemo(() => {
    return (corrales ?? []).filter((c) => c.activo)
  }, [corrales])

  const grupoSeleccionado = gruposVisibles.find((g) => g.id === grupoCorralesId)
  const corralSeleccionado = corralesVisibles.find((c) => c.id === corralId)

  const createMutation = useMutation({
    mutationFn: animalesApi.create,
    onSuccess: (animal) => {
      qc.invalidateQueries({ queryKey: ['animales'] })
      qc.invalidateQueries({ queryKey: ['aretes-disponibles'] })
      toast('success', `Animal registrado: ${animal.areteSiniiga ?? animal.areteBlancoActual?.codigo ?? 'sin arete'}`)
      router.push('/operador' as Route)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar'),
  })

  const areteOptions = [
    { value: '', label: 'Sin arete blanco' },
    ...(aretesDisponibles?.map((a) => ({ value: a.id, label: a.codigo })) ?? []),
  ]
  const loteOptions = [
    { value: '', label: 'Sin lote' },
    ...(lotes?.map((l) => ({ value: l.id, label: `${l.codigo}${l.procedencia ? ` — ${l.procedencia}` : ''}` })) ?? []),
  ]

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.areteSiniiga && !form.areteBlancoId) errs['aretes'] = 'El animal debe tener al menos un arete'
    if (!form.pesoEntrada || parseFloat(form.pesoEntrada) <= 0) errs['pesoEntrada'] = 'Peso requerido y mayor a 0'
    if (!form.fechaEntrada) errs['fechaEntrada'] = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!corralId) {
      toast('error', 'Selecciona el corral antes de continuar')
      setStep('ubicacion')
      return
    }
    const data: CreateAnimalInput = {
      areteSiniiga: form.areteSiniiga || undefined,
      areteBlancoId: form.areteBlancoId || undefined,
      sexo: form.sexo,
      pesoEntrada: parseFloat(form.pesoEntrada),
      fechaEntrada: form.fechaEntrada,
      corralId,
      loteId: form.loteId || undefined,
      notas: form.notas || undefined,
    }
    createMutation.mutate(data)
  }

  // Auto-select first corral when group changes
  useEffect(() => {
    if (!grupoCorralesId) return
    if (corralesVisibles.length === 0) {
      if (corralId) setCorralId('')
      return
    }
    const first = corralesVisibles[0]
    if (first && corralId !== first.id && !corralesVisibles.some((c) => c.id === corralId)) {
      setCorralId(first.id)
    }
  }, [grupoCorralesId, corralesVisibles, corralId])

  // ── STEP: UBICACIÓN ────────────────────────────────────────────────────────
  if (step === 'ubicacion') {
    return (
      <div className="space-y-5">
        <MobilePageHeader title="Registrar animal" subtitle="¿A qué grupo de corrales va a llegar?" />

        {gruposVisibles.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-2">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-[14px] font-medium text-foreground">Sin grupos asignados</p>
            <p className="text-[12px] text-muted-foreground">
              Pídele a tu director que te asigne al menos un grupo de corrales.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-bold tracking-widest uppercase text-foreground/40">Grupo de corrales</p>
              <div className="space-y-2">
                {gruposVisibles.map((g) => {
                  const active = g.id === grupoCorralesId
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGrupoCorralesId(g.id)
                        setCorralId('')
                      }}
                      className={cn(
                        'w-full rounded-xl border-2 p-4 flex items-center gap-3 transition-all text-left',
                        active
                          ? 'border-brand bg-brand/5'
                          : 'border-border bg-surface hover:border-border-strong active:bg-muted',
                      )}
                    >
                      <MapPin className={cn('h-5 w-5 shrink-0', active ? 'text-brand' : 'text-muted-foreground')} />
                      <span className="flex-1 text-[15px] font-semibold text-foreground">{g.nombre}</span>
                      {active && <Check className="h-5 w-5 text-brand shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {grupoCorralesId && corralesVisibles.length === 0 && (
              <p className="text-[13px] text-warning-foreground bg-warning-subtle border border-warning/30 rounded-lg p-3">
                Este grupo no tiene corrales activos. Pídele al director que cree uno.
              </p>
            )}

            <Button
              size="xl"
              className="w-full"
              disabled={!corralId}
              onClick={() => setStep('datos')}
            >
              Continuar
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── STEP: DATOS ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <MobilePageHeader
        title="Registrar animal"
        subtitle={grupoSeleccionado?.nombre}
        back={false}
        action={
          <button
            type="button"
            onClick={() => setStep('ubicacion')}
            className="text-[12px] text-brand font-medium hover:underline px-2"
          >
            Cambiar
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">
          {/* Identificación */}
          <div className="p-5 space-y-4">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-foreground/40">Identificación</h2>

            <BarcodeInput
              label="Arete SINIIGA (amarillo)"
              onScan={(codigo) => { setForm((f) => ({ ...f, areteSiniiga: codigo })); setSiniigaFromScan(true) }}
              resetAfterScan={false}
              autoFocus={false}
              placeholder="Escanea o escribe el SINIIGA"
            />
            {siniigaFromScan && form.areteSiniiga ? (
              <div className="flex items-center gap-2 text-sm text-success-foreground">
                <code className="font-mono bg-success-subtle px-2 py-0.5 rounded">{form.areteSiniiga}</code>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setForm((f) => ({ ...f, areteSiniiga: '' })); setSiniigaFromScan(false) }}>
                  Limpiar
                </button>
              </div>
            ) : (
              <Input
                label=""
                value={form.areteSiniiga}
                onChange={(e) => setForm((f) => ({ ...f, areteSiniiga: e.target.value.toUpperCase() }))}
                placeholder="O escribe el número SINIIGA manualmente"
              />
            )}

            <Select
              label="Arete blanco (operativo)"
              value={form.areteBlancoId}
              onChange={(e) => setForm((f) => ({ ...f, areteBlancoId: e.target.value }))}
              options={areteOptions}
              hint={`${aretesDisponibles?.length ?? 0} aretes disponibles`}
            />

            {errors['aretes'] && <p className="text-xs text-danger-foreground">{errors['aretes']}</p>}
          </div>

          {/* Datos */}
          <div className="p-5 space-y-4">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-foreground/40">Datos del animal</h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Sexo</label>
              <div className="grid grid-cols-2 gap-2">
                {SEXO_OPTIONS.map((opt) => {
                  const active = form.sexo === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, sexo: opt.value as SexoAnimal }))}
                      className={cn(
                        'h-12 rounded-lg border-2 text-[14px] font-semibold transition-colors',
                        active
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-border bg-surface text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <Input
              label="Peso de entrada (kg)"
              type="number"
              step="0.1"
              min="1"
              value={form.pesoEntrada}
              onChange={(e) => setForm((f) => ({ ...f, pesoEntrada: e.target.value }))}
              error={errors['pesoEntrada']}
              placeholder="245.5"
              required
            />

            <Input
              label="Fecha de llegada"
              type="date"
              value={form.fechaEntrada}
              onChange={(e) => setForm((f) => ({ ...f, fechaEntrada: e.target.value }))}
              error={errors['fechaEntrada']}
              required
            />
          </div>

          {/* Lote / notas */}
          <div className="p-5 space-y-4">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-foreground/40">Lote y notas</h2>

            <Select
              label="Lote de llegada (opcional)"
              value={form.loteId}
              onChange={(e) => setForm((f) => ({ ...f, loteId: e.target.value }))}
              options={loteOptions}
              hint="Agrupa animales que llegaron juntos"
            />

            <Input
              label="Notas (opcional)"
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones adicionales"
            />
          </div>

          {/* Acciones */}
          <div className="p-4 space-y-2">
            <Button type="submit" size="xl" loading={createMutation.isPending} className="w-full">
              <PawPrint className="h-5 w-5" />
              Registrar animal
            </Button>
            <Button variant="ghost" type="button" size="lg" onClick={() => setStep('ubicacion')} className="w-full">
              Volver
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
