'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PawPrint } from 'lucide-react'
import { animalesApi, CreateAnimalInput } from '@/lib/api/animales.api'
import { aretesApi } from '@/lib/api/aretes.api'
import { corralesApi } from '@/lib/api/corrales.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { SexoAnimal } from '@ganaderia/shared'

const SEXO_OPTIONS = [
  { value: SexoAnimal.MACHO, label: '♂ Macho' },
  { value: SexoAnimal.HEMBRA, label: '♀ Hembra' },
]

export default function NuevoAnimalPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    areteSiniiga: '',
    areteBlancoId: '',
    sexo: SexoAnimal.MACHO as SexoAnimal,
    pesoEntrada: '',
    fechaEntrada: new Date().toISOString().split('T')[0],
    grupoCorralesId: '',
    corralId: '',
    loteId: '',
    notas: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [siniigaFromScan, setSiniigaFromScan] = useState(false)

  const { data: grupos } = useQuery({ queryKey: ['grupos-corrales'], queryFn: gruposCorralesApi.findAll })
  const { data: corrales } = useQuery({
    queryKey: ['corrales', form.grupoCorralesId],
    queryFn: () => corralesApi.findAll(form.grupoCorralesId),
    enabled: !!form.grupoCorralesId,
  })
  const { data: aretesDisponibles } = useQuery({
    queryKey: ['aretes-disponibles'],
    queryFn: aretesApi.getDisponibles,
  })
  const { data: lotes } = useQuery({
    queryKey: ['lotes'],
    queryFn: animalesApi.findAllLotes,
  })

  const createMutation = useMutation({
    mutationFn: animalesApi.create,
    onSuccess: (animal) => {
      qc.invalidateQueries({ queryKey: ['animales'] })
      qc.invalidateQueries({ queryKey: ['aretes-disponibles'] })
      toast('success', `Animal registrado: ${animal.areteSiniiga ?? animal.areteBlancoActual?.codigo ?? 'sin arete'}`)
      router.push(`/animales/${animal.id}`)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar'),
  })

  const grupoOptions = grupos?.filter(g => g.activo).map(g => ({ value: g.id, label: g.nombre })) ?? []
  const corralOptions = corrales?.filter(c => c.activo).map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` })) ?? []
  const areteOptions = [
    { value: '', label: 'Sin arete blanco' },
    ...(aretesDisponibles?.map(a => ({ value: a.id, label: a.codigo })) ?? []),
  ]
  const loteOptions = [
    { value: '', label: 'Sin lote' },
    ...(lotes?.map(l => ({ value: l.id, label: `${l.codigo}${l.procedencia ? ` — ${l.procedencia}` : ''}` })) ?? []),
  ]

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.areteSiniiga && !form.areteBlancoId) errs['aretes'] = 'El animal debe tener al menos un arete'
    if (!form.pesoEntrada || parseFloat(form.pesoEntrada) <= 0) errs['pesoEntrada'] = 'Peso requerido y mayor a 0'
    if (!form.fechaEntrada) errs['fechaEntrada'] = 'Requerido'
    if (!form.corralId) errs['corralId'] = 'Selecciona un corral'
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
      corralId: form.corralId,
      loteId: form.loteId || undefined,
      notas: form.notas || undefined,
    }
    createMutation.mutate(data)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Registrar llegada</h1>
          <p className="text-sm text-muted-foreground">Alta de nuevo animal en el sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-border bg-surface divide-y divide-border">

          {/* Sección aretes */}
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-brand text-xs font-bold">1</span>
              </div>
              <h2 className="text-sm font-semibold text-foreground">Identificación</h2>
            </div>

            <BarcodeInput
              label="Arete SINIIGA (amarillo)"
              onScan={(codigo) => { setForm(f => ({ ...f, areteSiniiga: codigo })); setSiniigaFromScan(true) }}
              resetAfterScan={false}
              placeholder="Escanea el arete amarillo SINIIGA..."
            />
            {siniigaFromScan && form.areteSiniiga && (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <code className="font-mono bg-green-500/10 px-2 py-0.5 rounded">{form.areteSiniiga}</code>
                <span className="text-muted-foreground">escaneado</span>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setForm(f => ({ ...f, areteSiniiga: '' })); setSiniigaFromScan(false) }}>
                  Limpiar
                </button>
              </div>
            )}
            {!siniigaFromScan && (
              <Input
                label=""
                value={form.areteSiniiga}
                onChange={e => setForm(f => ({ ...f, areteSiniiga: e.target.value.toUpperCase() }))}
                placeholder="O escribe el número SINIIGA manualmente"
              />
            )}

            <Select
              label="Arete blanco (operativo)"
              value={form.areteBlancoId}
              onChange={e => setForm(f => ({ ...f, areteBlancoId: e.target.value }))}
              options={areteOptions}
              hint={`${aretesDisponibles?.length ?? 0} aretes disponibles en el pool`}
            />

            {errors['aretes'] && (
              <p className="text-xs text-red-500">{errors['aretes']}</p>
            )}
          </div>

          {/* Sección datos */}
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-brand text-xs font-bold">2</span>
              </div>
              <h2 className="text-sm font-semibold text-foreground">Datos del animal</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Sexo <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {SEXO_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sexo"
                        value={opt.value}
                        checked={form.sexo === opt.value}
                        onChange={() => setForm(f => ({ ...f, sexo: opt.value as SexoAnimal }))}
                        className="accent-brand"
                      />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Input
                label="Peso de entrada (kg)"
                type="number"
                step="0.1"
                min="1"
                value={form.pesoEntrada}
                onChange={e => setForm(f => ({ ...f, pesoEntrada: e.target.value }))}
                error={errors['pesoEntrada']}
                placeholder="245.5"
                required
              />
            </div>

            <Input
              label="Fecha de llegada"
              type="date"
              value={form.fechaEntrada}
              onChange={e => setForm(f => ({ ...f, fechaEntrada: e.target.value }))}
              error={errors['fechaEntrada']}
              required
            />
          </div>

          {/* Sección ubicación */}
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-brand text-xs font-bold">3</span>
              </div>
              <h2 className="text-sm font-semibold text-foreground">Ubicación y agrupación</h2>
            </div>

            <Select
              label="Grupo de corrales"
              value={form.grupoCorralesId}
              onChange={e => setForm(f => ({ ...f, grupoCorralesId: e.target.value, corralId: '' }))}
              options={grupoOptions}
              placeholder="Selecciona un grupo"
              required
            />

            <Select
              label="Corral"
              value={form.corralId}
              onChange={e => setForm(f => ({ ...f, corralId: e.target.value }))}
              options={corralOptions}
              placeholder={form.grupoCorralesId ? 'Selecciona un corral' : 'Primero selecciona un grupo'}
              error={errors['corralId']}
              disabled={!form.grupoCorralesId}
              required
            />

            <Select
              label="Lote de llegada (opcional)"
              value={form.loteId}
              onChange={e => setForm(f => ({ ...f, loteId: e.target.value }))}
              options={loteOptions}
              hint="Agrupa animales que llegaron juntos"
            />

            <Input
              label="Notas (opcional)"
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones adicionales"
            />
          </div>

          {/* Acciones */}
          <div className="p-5 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              <PawPrint className="h-4 w-4" />
              Registrar animal
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
