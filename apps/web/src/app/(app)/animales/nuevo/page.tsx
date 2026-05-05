'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CattleIcon } from '@/components/icons/cattle-icon'
import { animalesApi, CreateAnimalInput } from '@/lib/api/animales.api'
import { aretesApi } from '@/lib/api/aretes.api'
import { corralesApi } from '@/lib/api/corrales.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { SexoAnimal } from '@ganaderia/shared'

const SEXO_OPTIONS = [
  { value: SexoAnimal.MACHO, label: '♂ Macho' },
  { value: SexoAnimal.HEMBRA, label: '♀ Hembra' },
]

export default function NuevoAnimalDesktopPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const [selectedGrupo, setSelectedGrupo] = useState('')
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
    queryKey: ['corrales', selectedGrupo],
    queryFn: () => corralesApi.findAll(selectedGrupo),
    enabled: !!selectedGrupo,
  })
  const { data: aretesDisponibles } = useQuery({
    queryKey: ['aretes-disponibles'],
    queryFn: aretesApi.getDisponibles,
  })
  const { data: lotes } = useQuery({
    queryKey: ['lotes'],
    queryFn: animalesApi.findAllLotes,
  })

  const gruposActivos = useMemo(() => (grupos ?? []).filter((g) => g.activo), [grupos])
  const corralesActivos = useMemo(() => (corrales ?? []).filter((c) => c.activo), [corrales])

  useEffect(() => {
    if (!selectedGrupo) { setCorralId(''); return }
    if (corralesActivos.length > 0) {
      setCorralId(corralesActivos[0].id)
    } else {
      setCorralId('')
    }
  }, [selectedGrupo, corralesActivos])

  const grupoOptions = [
    { value: '', label: 'Selecciona un grupo...' },
    ...gruposActivos.map((g) => ({ value: g.id, label: g.nombre })),
  ]
  const areteOptions = [
    { value: '', label: 'Sin arete blanco' },
    ...(aretesDisponibles?.map((a) => ({ value: a.id, label: a.codigo })) ?? []),
  ]
  const loteOptions = [
    { value: '', label: 'Sin lote' },
    ...(lotes?.map((l) => ({ value: l.id, label: `${l.codigo}${l.procedencia ? ` — ${l.procedencia}` : ''}` })) ?? []),
  ]

  const createMutation = useMutation({
    mutationFn: animalesApi.create,
    onSuccess: (animal) => {
      qc.invalidateQueries({ queryKey: ['animales'] })
      qc.invalidateQueries({ queryKey: ['aretes-disponibles'] })
      toast('success', `Animal registrado: ${animal.areteSiniiga ?? animal.areteBlancoActual?.codigo ?? 'sin arete'}`)
      router.push('/animales' as Route)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar'),
  })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.areteSiniiga && !form.areteBlancoId) errs['aretes'] = 'El animal debe tener al menos un arete'
    if (!selectedGrupo) errs['grupo'] = 'Selecciona el grupo de corrales'
    if (selectedGrupo && !corralId) errs['grupo'] = 'El grupo seleccionado no tiene corrales activos'
    if (!form.pesoEntrada || parseFloat(form.pesoEntrada) <= 0) errs['pesoEntrada'] = 'Peso requerido y mayor a 0'
    if (!form.fechaEntrada) errs['fechaEntrada'] = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar llegada de animal"
        description="Ingresa los datos del animal que llega al rancho"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-5">

            {/* Ubicación */}
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-foreground/40">Ubicación</h2>
              <Select
                label="Grupo de corrales"
                value={selectedGrupo}
                onChange={(e) => setSelectedGrupo(e.target.value)}
                options={grupoOptions}
                error={errors['grupo']}
                required
              />
              {selectedGrupo && corralesActivos.length === 0 && (
                <p className="text-xs text-warning-foreground bg-warning-subtle border border-warning/30 rounded-lg p-2">
                  Este grupo no tiene corrales activos. Pídele al director que cree uno.
                </p>
              )}
            </div>

            {/* Identificación */}
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
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

            {/* Datos del animal */}
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-foreground/40">Datos del animal</h2>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Sexo</label>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                  {SEXO_OPTIONS.map((opt) => {
                    const active = form.sexo === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, sexo: opt.value as SexoAnimal }))}
                        className={cn(
                          'h-10 rounded-lg border-2 text-[13px] font-semibold transition-colors',
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

              <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Columna lateral */}
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
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

            <div className="space-y-2">
              <Button type="submit" size="lg" loading={createMutation.isPending} className="w-full">
                <CattleIcon className="h-4 w-4" />
                Registrar animal
              </Button>
              <Button
                variant="ghost"
                type="button"
                size="md"
                onClick={() => router.push('/animales' as Route)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
