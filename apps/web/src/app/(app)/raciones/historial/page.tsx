'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import { History, ArrowLeft, Scale } from 'lucide-react'
import { racionesApi } from '@/lib/api/raciones.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/utils'

export default function HistorialRacionesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['raciones-historial'],
    queryFn: () => racionesApi.listarHistorial(200),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de raciones"
        description="Todas las raciones definidas (activas e inactivas)"
        action={
          <Link href={'/raciones' as Route}>
            <Button variant="secondary" size="md"><ArrowLeft className="h-4 w-4" />Volver</Button>
          </Link>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : !data?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={History} title="Sin historial" description="No se han definido raciones todavía" />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ración</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Corral</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Mañana</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarde</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Inicio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{r.nombre}</p>
                        {r.descripcion && <p className="text-xs text-muted-foreground line-clamp-1">{r.descripcion}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-foreground">{r.corral?.nombre ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{r.corral?.grupoCorrales?.nombre}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-mono">{Number(r.cantidadKgManana)} kg</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-mono">{Number(r.cantidadKgTarde)} kg</td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{formatDateTime(r.fechaInicio)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {r.fechaFin ? formatDateTime(r.fechaFin) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {r.activa ? <Badge variant="success" dot>Activa</Badge> : <Badge variant="muted">Cerrada</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
