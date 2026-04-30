'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Tag, MapPin, Scale, Calendar, DollarSign,
  Syringe, Clock, AlertTriangle, CheckCircle,
} from 'lucide-react'
import { animalesApi } from '@/lib/api/animales.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { TipoUsuario, SexoAnimal, EstadoAnimal } from '@ganaderia/shared'
import { useState } from 'react'

export default function FichaAnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  const [confirmLiberar, setConfirmLiberar] = useState(false)

  const { data: animal, isLoading } = useQuery({
    queryKey: ['animal', id],
    queryFn: () => animalesApi.findOne(id),
  })

  const liberarMutation = useMutation({
    mutationFn: () => animalesApi.liberarArete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animal', id] })
      qc.invalidateQueries({ queryKey: ['aretes-disponibles'] })
      toast('success', 'Arete blanco liberado y disponible nuevamente')
      setConfirmLiberar(false)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const esAdmin = usuario?.tipo === TipoUsuario.SUPERUSUARIO || usuario?.tipo === TipoUsuario.ADMIN

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
  }

  if (!animal) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Animal no encontrado</h2>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/animales')}>
          Volver al listado
        </Button>
      </div>
    )
  }

  const areteActivo = animal.areteBlancoActual
  const estadoColor: Record<string, 'success' | 'muted' | 'danger' | 'warning'> = {
    ACTIVO: 'success', EGRESADO: 'muted', MUERTO: 'danger', BAJA: 'warning',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/animales')} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {animal.areteSiniiga ?? animal.areteBlancoActual?.codigo ?? 'Animal sin arete'}
            </h1>
            <p className="text-sm text-muted-foreground">Ficha de animal</p>
          </div>
        </div>
        <Badge variant={estadoColor[animal.estado] ?? 'muted'}>{animal.estado}</Badge>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
        {/* Aretes */}
        <div className="flex flex-wrap gap-3">
          {animal.areteSiniiga && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <Tag className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-amber-500/70 font-medium">SINIIGA</p>
                <p className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">{animal.areteSiniiga}</p>
              </div>
            </div>
          )}
          {areteActivo ? (
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">BLANCO ACTIVO</p>
                <p className="text-sm font-mono font-bold text-foreground">{areteActivo.codigo}</p>
              </div>
              {esAdmin && animal.estado === EstadoAnimal.EGRESADO && (
                <button
                  onClick={() => setConfirmLiberar(true)}
                  className="ml-2 text-xs text-muted-foreground hover:text-brand transition-colors"
                >
                  Liberar
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Sin arete blanco activo</p>
            </div>
          )}
        </div>

        {/* Grid de datos */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sexo</p>
            <Badge variant={animal.sexo === SexoAnimal.MACHO ? 'info' : 'warning'}>
              {animal.sexo === SexoAnimal.MACHO ? '♂ Macho' : '♀ Hembra'}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Peso entrada</p>
            <div className="flex items-center gap-1.5 text-foreground">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{animal.pesoEntrada} kg</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha entrada</p>
            <div className="flex items-center gap-1.5 text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(animal.fechaEntrada)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ubicación</p>
            <div className="flex items-center gap-1.5 text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{animal.corral.nombre}</p>
                <p className="text-xs text-muted-foreground">{animal.corral.grupoCorrales.nombre}</p>
              </div>
            </div>
          </div>
          {animal.lote && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lote</p>
              <div>
                <p className="text-sm font-medium text-foreground">{animal.lote.codigo}</p>
                {animal.lote.procedencia && (
                  <p className="text-xs text-muted-foreground">{animal.lote.procedencia}</p>
                )}
              </div>
            </div>
          )}
          {animal.fechaEgreso && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Egreso</p>
              <div>
                <p className="text-sm font-medium text-foreground">{formatDate(animal.fechaEgreso)}</p>
                <p className="text-xs text-muted-foreground">{animal.causaEgreso}</p>
              </div>
            </div>
          )}
        </div>

        {animal.notas && (
          <p className="text-sm text-muted-foreground border-t border-border pt-4">{animal.notas}</p>
        )}
      </div>

      {/* Costo acumulado */}
      <div className="rounded-xl border border-brand/30 bg-brand/5 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Costo acumulado</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(animal.costoAcumulado)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{animal.aplicaciones.length} tratamientos</p>
          {animal.precioVenta && (
            <p className="text-sm font-semibold text-green-500">
              Vendido: {formatCurrency(animal.precioVenta)}
            </p>
          )}
        </div>
      </div>

      {/* Historial de tratamientos */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Syringe className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Historial de tratamientos</h2>
          <span className="ml-auto text-xs text-muted-foreground">{animal.aplicaciones.length} registro{animal.aplicaciones.length !== 1 ? 's' : ''}</span>
        </div>

        {animal.aplicaciones.length === 0 ? (
          <div className="p-8 text-center">
            <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin tratamientos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {animal.aplicaciones.map((ap) => (
              <div key={ap.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {ap.template?.nombre ?? 'Aplicación individual'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(ap.fechaAplicacion)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ap.aplicadoPor.nombre} {ap.aplicadoPor.apellido}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(ap.costoTotalCalculado)}
                  </span>
                </div>

                {ap.items.length > 0 && (
                  <div className="mt-2 ml-6 space-y-1">
                    {ap.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.medicamento.nombre} — {item.dosisAplicada} {item.unidadDosis}</span>
                        <span>{formatCurrency(item.costoItemCalculado)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {ap.notas && (
                  <p className="mt-2 ml-6 text-xs text-muted-foreground italic">{ap.notas}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm liberar arete */}
      <ConfirmDialog
        open={confirmLiberar}
        onClose={() => setConfirmLiberar(false)}
        onConfirm={() => liberarMutation.mutate()}
        loading={liberarMutation.isPending}
        title="Liberar arete blanco"
        description={`¿Liberar el arete "${areteActivo?.codigo}"? Quedará disponible para asignarse a otro animal.`}
        confirmLabel="Liberar arete"
        variant="warning"
      />
    </div>
  )
}
