'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Route } from 'next'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Syringe, CheckCircle2, AlertCircle, RotateCcw, ChevronRight,
  Plus, X, DollarSign, History,
} from 'lucide-react'
import { scanApi } from '@/lib/api/scan.api'
import { animalesApi } from '@/lib/api/animales.api'
import { tratamientoTemplatesApi, tratamientosApi, TratamientoTemplate, PreviewCostoResult } from '@/lib/api/tratamientos.api'
import { medicamentosApi } from '@/lib/api/medicamentos.api'
import { BarcodeInput } from '@/components/scanner/barcode-input'
import { ScanResultAnimalCard } from '@/components/scanner/scan-result-animal'
import { MobilePageHeader } from '@/components/operador/mobile-page-header'
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
  const searchParams = useSearchParams()
  const animalIdParam = searchParams.get('animalId')

  const [step, setStep] = useState<Step>('scan')
  const [animalResult, setAnimalResult] = useState<ScanResultAnimal | null>(null)
  const [modo, setModo] = useState<Modo>('kit')
  const [kitSeleccionado, setKitSeleccionado] = useState<TratamientoTemplate | null>(null)
  const [itemsIndividuales, setItemsIndividuales] = useState<ItemIndividual[]>([])
  const [notas, setNotas] = useState('')
  const [preview, setPreview] = useState<PreviewCostoResult | null>(null)
  const [nuevoItem, setNuevoItem] = useState<{
    medicamentoId: string
    dosis: number
    unidadDosis: UnidadMedida
  }>({ medicamentoId: '', dosis: 1, unidadDosis: UnidadMedida.ML })

  const { data: kits } = useQuery({
    queryKey: ['tratamiento-templates'],
    queryFn: tratamientoTemplatesApi.findAll,
  })

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos'],
    queryFn: medicamentosApi.findAll,
    enabled: modo === 'individual',
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

  // Pre-cargar animal si viene por query param (desde historial)
  useEffect(() => {
    if (!animalIdParam || animalResult || step !== 'scan') return
    let cancelled = false
    animalesApi.findOne(animalIdParam)
      .then((animal) => {
        if (cancelled) return
        if (animal.estado !== 'ACTIVO') {
          toast('error', `Animal no activo (${animal.estado})`)
          return
        }
        const result: ScanResultAnimal = {
          tipo: 'ANIMAL',
          animal: {
            id: animal.id,
            areteSiniiga: animal.areteSiniiga,
            areteBlancoActual: animal.areteBlancoActual?.codigo ?? null,
            sexo: animal.sexo,
            pesoEntrada: Number(animal.pesoEntrada),
            fechaEntrada: animal.fechaEntrada,
            estado: animal.estado,
            corral: {
              id: animal.corral.id,
              nombre: animal.corral.nombre,
              codigo: animal.corral.codigo,
              grupoCorrales: {
                id: animal.corral.grupoCorrales.id,
                nombre: animal.corral.grupoCorrales.nombre,
              },
            },
            costoAcumulado: Number(animal.costoAcumulado),
            tratamientosCount: animal.aplicaciones?.length ?? 0,
          },
        }
        setAnimalResult(result)
        setStep('seleccion')
      })
      .catch(() => toast('error', 'No se pudo cargar el animal'))
    return () => { cancelled = true }
  }, [animalIdParam, animalResult, step])

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

  const medicamentoOptions = (medicamentos ?? []).map(m => ({
    value: m.id,
    label: `${m.nombre} (${m.unidadMedida})`,
  }))

  // ── STEP: SCAN ──────────────────────────────────────────────────────────────
  if (step === 'scan') {
    return (
      <div className="space-y-5">
        <MobilePageHeader title="Aplicar tratamiento" subtitle="Escanea el arete del animal" />
        <div className="space-y-3">
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

        <Link
          href={'/operador/tratamientos/historial' as Route}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-border-strong active:bg-muted/40 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <History className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-foreground">Ver tratamientos recientes</p>
            <p className="text-[12px] text-muted-foreground">Repite uno sin volver a escanear</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      </div>
    )
  }

  // ── STEP: SELECCIÓN ─────────────────────────────────────────────────────────
  if (step === 'seleccion' && animalResult) {
    return (
      <div className="space-y-5">
        <MobilePageHeader
          title="Seleccionar tratamiento"
          back={false}
          action={
            <button
              onClick={resetAll}
              aria-label="Nuevo escaneo"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          }
        />

        <div className="space-y-4">
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
                  label="Medicamento"
                  value={nuevoItem.medicamentoId}
                  onChange={e => setNuevoItem(n => ({ ...n, medicamentoId: e.target.value }))}
                  options={[{ value: '', label: 'Selecciona...' }, ...medicamentoOptions]}
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
            size="xl"
            className="w-full"
            onClick={handleIrAPreview}
            disabled={previewMutation.isPending}
          >
            {previewMutation.isPending ? 'Calculando…' : 'Ver costo estimado'}
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP: PREVIEW ───────────────────────────────────────────────────────────
  if (step === 'preview' && animalResult && preview) {
    const haysinStock = preview.items.some(i => i.sinStock)

    return (
      <div className="space-y-5">
        <MobilePageHeader
          title="Confirmar tratamiento"
          back={false}
          action={
            <button
              onClick={() => setStep('seleccion')}
              aria-label="Volver al paso anterior"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          }
        />

        <div className="space-y-4">
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
            size="xl"
            className="w-full"
            onClick={handleConfirmar}
            disabled={aplicarMutation.isPending}
          >
            <Syringe className="h-5 w-5" />
            {aplicarMutation.isPending ? 'Registrando…' : 'Confirmar tratamiento'}
          </Button>
        </div>
      </div>
    )
  }

  // ── STEP: ÉXITO ─────────────────────────────────────────────────────────────
  if (step === 'exito') {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-success/30 bg-success-subtle/60 p-6 text-center space-y-3">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[17px]">Tratamiento aplicado</p>
            {animalResult && (
              <p className="text-[13px] text-muted-foreground">
                {animalResult.animal.areteSiniiga
                  ? `SINIIGA: ${animalResult.animal.areteSiniiga}`
                  : animalResult.animal.areteBlancoActual
                  ? `Blanco: ${animalResult.animal.areteBlancoActual}`
                  : 'Animal registrado'}
              </p>
            )}
          </div>
        </div>

        <Button variant="primary" size="xl" className="w-full" onClick={resetAll}>
          <Syringe className="h-5 w-5" />
          Otro tratamiento
        </Button>
      </div>
    )
  }

  return null
}
