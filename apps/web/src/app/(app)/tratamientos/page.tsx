'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Syringe, CheckCircle2, AlertCircle, RotateCcw, ChevronRight,
  Plus, X, DollarSign,
} from 'lucide-react'
import { scanApi } from '@/lib/api/scan.api'
import { tratamientoTemplatesApi, tratamientosApi, TratamientoTemplate, PreviewCostoResult } from '@/lib/api/tratamientos.api'
import { medicamentosApi } from '@/lib/api/medicamentos.api'
import { farmaciasApi } from '@/lib/api/farmacias.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { ScanResultAnimalCard } from '@/components/scanner/scan-result-animal'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { ScanResultAnimal } from '@ganaderia/shared'
import { UnidadMedida } from '@ganaderia/shared'

type Step = 'scan' | 'seleccion' | 'preview' | 'exito'
type Modo = 'kit' | 'individual'

interface ItemIndividual {
  medicamentoId: string
  medicamentoNombre: string
  dosis: number
  unidadDosis: UnidadMedida
}

const UNIDAD_OPTIONS = Object.values(UnidadMedida).map(v => ({ value: v, label: v }))

export default function TratamientosPage() {
  const [step, setStep] = useState<Step>('scan')
  const [animalResult, setAnimalResult] = useState<ScanResultAnimal | null>(null)
  const [modo, setModo] = useState<Modo>('kit')
  const [kitSeleccionado, setKitSeleccionado] = useState<TratamientoTemplate | null>(null)
  const [itemsIndividuales, setItemsIndividuales] = useState<ItemIndividual[]>([])
  const [notas, setNotas] = useState('')
  const [preview, setPreview] = useState<PreviewCostoResult | null>(null)
  const [farmaciaId, setFarmaciaId] = useState('')
  const [nuevoItem, setNuevoItem] = useState<{
    medicamentoId: string
    dosis: number
    unidadDosis: UnidadMedida
  }>({ medicamentoId: '', dosis: 1, unidadDosis: UnidadMedida.ML })

  const { data: kits } = useQuery({
    queryKey: ['tratamiento-templates'],
    queryFn: tratamientoTemplatesApi.findAll,
  })

  const { data: farmacias } = useQuery({
    queryKey: ['farmacias'],
    queryFn: farmaciasApi.findAll,
    enabled: modo === 'individual',
  })

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos', farmaciaId],
    queryFn: () => medicamentosApi.findAll(farmaciaId),
    enabled: modo === 'individual' && !!farmaciaId,
  })

  const scanMutation = useMutation({
    mutationFn: (codigo: string) => scanApi.resolve(codigo, 'ANIMAL'),
    onSuccess: (result) => {
      if (result.tipo !== 'ANIMAL') {
        toast('error', 'Código no corresponde a un animal')
        return
      }
      if (result.animal.estado !== 'ACTIVO') {
        toast('error', `Animal no activo (${result.animal.estado})`)
        return
      }
      setAnimalResult(result as ScanResultAnimal)
      setStep('seleccion')
    },
    onError: () => toast('error', 'Error al resolver el código'),
  })

  const previewMutation = useMutation({
    mutationFn: tratamientosApi.previewCosto,
    onSuccess: (data) => {
      setPreview(data)
      setStep('preview')
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al calcular costo'),
  })

  const aplicarMutation = useMutation({
    mutationFn: tratamientosApi.create,
    onSuccess: () => setStep('exito'),
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar tratamiento'),
  })

  function handleScan(codigo: string) {
    if (!codigo.trim()) return
    scanMutation.mutate(codigo)
  }

  function resetAll() {
    setStep('scan')
    setAnimalResult(null)
    setKitSeleccionado(null)
    setItemsIndividuales([])
    setNotas('')
    setPreview(null)
    setNuevoItem({ medicamentoId: '', dosis: 1, unidadDosis: UnidadMedida.ML })
  }

  function handleIrAPreview() {
    if (!animalResult) return
    if (modo === 'kit' && !kitSeleccionado) { toast('error', 'Selecciona un kit'); return }
    if (modo === 'individual' && itemsIndividuales.length === 0) { toast('error', 'Agrega al menos un medicamento'); return }

    previewMutation.mutate({
      animalId: animalResult.animal.id,
      templateId: modo === 'kit' ? kitSeleccionado!.id : undefined,
      items: modo === 'individual'
        ? itemsIndividuales.map(i => ({
            medicamentoId: i.medicamentoId,
            dosis: i.dosis,
            unidadDosis: i.unidadDosis,
          }))
        : undefined,
    })
  }

  function handleConfirmar() {
    if (!animalResult) return
    aplicarMutation.mutate({
      animalId: animalResult.animal.id,
      templateId: modo === 'kit' ? kitSeleccionado?.id : undefined,
      items: modo === 'individual'
        ? itemsIndividuales.map(i => ({
            medicamentoId: i.medicamentoId,
            dosis: i.dosis,
            unidadDosis: i.unidadDosis,
          }))
        : undefined,
      notas: notas.trim() || undefined,
    })
  }

  function agregarItemIndividual() {
    if (!nuevoItem.medicamentoId || !nuevoItem.dosis) return
    const med = medicamentos?.find(m => m.id === nuevoItem.medicamentoId)
    setItemsIndividuales(prev => [
      ...prev,
      {
        medicamentoId: nuevoItem.medicamentoId,
        medicamentoNombre: med?.nombre ?? nuevoItem.medicamentoId,
        dosis: nuevoItem.dosis,
        unidadDosis: nuevoItem.unidadDosis,
      },
    ])
    setNuevoItem({ medicamentoId: '', dosis: 1, unidadDosis: UnidadMedida.ML })
  }

  function removeItemIndividual(idx: number) {
    setItemsIndividuales(prev => prev.filter((_, i) => i !== idx))
  }

  const farmaciaOptions = (farmacias ?? []).map(f => ({ value: f.id, label: f.nombre }))
  const medicamentoOptions = (medicamentos ?? []).map(m => ({
    value: m.id,
    label: `${m.nombre} (${m.unidadMedida})`,
  }))

  // ── STEP: SCAN ──────────────────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aplicar Tratamiento"
          description="Escanea el arete del animal para comenzar"
        />
        <div className="max-w-lg mx-auto space-y-4">
          <BarcodeInput
            onScan={handleScan}
            loading={scanMutation.isPending}
            label="Arete del animal"
            resetAfterScan={false}
            autoFocus
          />
          {scanMutation.isPending && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Buscando animal…
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── STEP: SELECCIÓN ─────────────────────────────────────────────────────────
  if (step === 'seleccion' && animalResult) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Seleccionar Tratamiento"
          action={
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Nuevo escaneo
            </button>
          }
        />

        <div className="max-w-lg mx-auto space-y-4">
          {/* Animal card */}
          <ScanResultAnimalCard result={animalResult} onClear={resetAll} />

          {/* Selector de modo */}
          <div className="flex gap-2">
            <button
              onClick={() => setModo('kit')}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                modo === 'kit'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              Usar kit
            </button>
            <button
              onClick={() => setModo('individual')}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                modo === 'individual'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              Individual
            </button>
          </div>

          {/* Modo kit */}
          {modo === 'kit' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Kit de tratamiento</label>
              {!kits || kits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay kits definidos. Crea uno en Administración → Kits.</p>
              ) : (
                <div className="space-y-2">
                  {kits.map(kit => (
                    <button
                      key={kit.id}
                      onClick={() => setKitSeleccionado(kit)}
                      className={`w-full text-left rounded-xl border-2 p-3.5 transition-colors ${
                        kitSeleccionado?.id === kit.id
                          ? 'border-brand bg-brand/5'
                          : 'border-border bg-background hover:border-brand/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{kit.nombre}</p>
                          {kit.descripcion && (
                            <p className="text-xs text-muted-foreground mt-0.5">{kit.descripcion}</p>
                          )}
                        </div>
                        {kitSeleccionado?.id === kit.id && (
                          <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {kit.items.map(item => (
                          <span
                            key={item.id}
                            className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-muted-foreground"
                          >
                            {item.medicamento.nombre} · {item.dosis} {item.unidadDosis}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modo individual */}
          {modo === 'individual' && (
            <div className="space-y-3">
              {itemsIndividuales.length > 0 && (
                <div className="space-y-1.5">
                  {itemsIndividuales.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-foreground">{item.medicamentoNombre}</span>
                      <span className="text-sm font-mono text-brand">{item.dosis} {item.unidadDosis}</span>
                      <button
                        onClick={() => removeItemIndividual(idx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border p-3 space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Agregar medicamento
                </p>
                <Select
                  label="Farmacia"
                  value={farmaciaId}
                  onChange={e => setFarmaciaId(e.target.value)}
                  options={[{ value: '', label: 'Selecciona...' }, ...farmaciaOptions]}
                />
                <Select
                  label="Medicamento"
                  value={nuevoItem.medicamentoId}
                  onChange={e => setNuevoItem(n => ({ ...n, medicamentoId: e.target.value }))}
                  options={[{ value: '', label: 'Selecciona...' }, ...medicamentoOptions]}
                  disabled={!farmaciaId}
                />
                <div className="flex gap-2">
                  <Input
                    label="Dosis"
                    type="number"
                    min={0.001}
                    step={0.5}
                    value={nuevoItem.dosis}
                    onChange={e => setNuevoItem(n => ({ ...n, dosis: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <Select
                    label="Unidad"
                    value={nuevoItem.unidadDosis}
                    onChange={e => setNuevoItem(n => ({ ...n, unidadDosis: e.target.value as UnidadMedida }))}
                    options={UNIDAD_OPTIONS}
                    className="flex-1"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={agregarItemIndividual}
                  disabled={!nuevoItem.medicamentoId || !nuevoItem.dosis}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Agregar
                </Button>
              </div>
            </div>
          )}

          {/* Notas */}
          <Input
            label="Notas (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones del tratamiento..."
          />

          <Button
            variant="primary"
            className="w-full"
            onClick={handleIrAPreview}
            disabled={previewMutation.isPending}
          >
            {previewMutation.isPending ? 'Calculando…' : 'Ver costo estimado'}
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP: PREVIEW ───────────────────────────────────────────────────────────
  if (step === 'preview' && animalResult && preview) {
    const haysinStock = preview.items.some(i => i.sinStock)

    return (
      <div className="space-y-6">
        <PageHeader
          title="Confirmar Tratamiento"
          action={
            <button
              onClick={() => setStep('seleccion')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Volver
            </button>
          }
        />

        <div className="max-w-lg mx-auto space-y-4">
          <ScanResultAnimalCard result={animalResult} />

          {/* Preview de costo */}
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <DollarSign className="h-4 w-4 text-brand" />
              Costo estimado del tratamiento
            </div>

            {haysinStock && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Algunos medicamentos no tienen stock disponible en la farmacia — el costo se calculará en $0.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {preview.items.map((item, idx) => {
                const nombre = modo === 'kit'
                  ? kitSeleccionado?.items[idx]?.medicamento.nombre ?? item.medicamentoId
                  : itemsIndividuales[idx]?.medicamentoNombre ?? item.medicamentoId

                return (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono">
                        {item.dosis} {item.unidadDosis} × {formatCurrency(item.costoPorMedida)}/u
                      </span>
                      {item.sinStock ? (
                        <Badge variant="warning">Sin stock</Badge>
                      ) : (
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(item.costoItemCalculado)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-brand">
                {formatCurrency(preview.costoTotal)}
              </span>
            </div>
          </div>

          {modo === 'kit' && kitSeleccionado && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="info">Kit</Badge>
              {kitSeleccionado.nombre}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            onClick={handleConfirmar}
            disabled={aplicarMutation.isPending}
          >
            <Syringe className="h-4 w-4 mr-2" />
            {aplicarMutation.isPending ? 'Registrando…' : 'Confirmar tratamiento'}
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP: ÉXITO ─────────────────────────────────────────────────────────────
  if (step === 'exito') {
    return (
      <div className="space-y-6">
        <PageHeader title="Tratamiento registrado" />
        <div className="max-w-lg mx-auto space-y-6">
          <div className="rounded-xl border border-green-500/40 bg-green-500/5 p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold text-foreground text-lg">Tratamiento aplicado</p>
            {animalResult && (
              <p className="text-sm text-muted-foreground">
                {animalResult.animal.areteSiniiga
                  ? `SINIIGA: ${animalResult.animal.areteSiniiga}`
                  : animalResult.animal.areteBlancoActual
                  ? `Blanco: ${animalResult.animal.areteBlancoActual}`
                  : 'Animal registrado'}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={resetAll}>
              <Syringe className="h-4 w-4 mr-2" />
              Otro tratamiento
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
