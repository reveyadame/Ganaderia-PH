'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Syringe, ChevronRight, History } from 'lucide-react'
import { tratamientosApi, AplicacionTratamientoConAnimal } from '@/lib/api/tratamientos.api'
import { MobilePageHeader } from '@/components/operador/mobile-page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function areteDe(a: AplicacionTratamientoConAnimal['animal']): string {
  if (a.areteSiniiga) return a.areteSiniiga
  const blanco = a.asignacionesArete[0]?.areteBlanco?.codigo
  if (blanco) return blanco
  return 'Sin arete'
}

export default function HistorialTratamientosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tratamientos-recientes-operador'],
    queryFn: () => tratamientosApi.listarRecientes(50),
  })

  return (
    <div className="space-y-5">
      <MobilePageHeader title="Historial de tratamientos" subtitle="Últimos 50 aplicados" />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-2">
          <History className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-[14px] font-medium text-foreground">Sin tratamientos registrados</p>
          <p className="text-[12px] text-muted-foreground">
            Cuando apliques un tratamiento aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((t) => {
            const arete = areteDe(t.animal)
            const kit = t.template?.nombre
            const items = t.items.length
            return (
              <Link
                key={t.id}
                href={`/operador/tratamientos?animalId=${t.animal.id}` as Route}
                className="block rounded-xl border border-border bg-surface p-4 hover:border-border-strong active:bg-muted/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0">
                    <Syringe className="h-5 w-5 text-accent-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-mono font-semibold text-[14px] text-foreground truncate">{arete}</p>
                      {t.animal.estado !== 'ACTIVO' && (
                        <Badge variant="muted" className="text-[10px]">{t.animal.estado}</Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {t.animal.corral.grupoCorrales.nombre} · {t.animal.corral.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[12px]">
                      {kit ? (
                        <Badge variant="info" className="text-[10px]">{kit}</Badge>
                      ) : (
                        <Badge variant="muted" className="text-[10px]">{items} med.</Badge>
                      )}
                      <span className="text-muted-foreground">{formatDate(t.fechaAplicacion)}</span>
                      <span className="text-muted-foreground tabular-nums">· {formatCurrency(t.costoTotalCalculado)}</span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
