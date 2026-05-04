'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import { History, ArrowLeft, UtensilsCrossed } from 'lucide-react'
import { comederoLecturasApi } from '@/lib/api/comederos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/utils'

export default function HistorialComederosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['comederos-historial'],
    queryFn: () => comederoLecturasApi.getHistorial(200),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de lecturas"
        description="Todas las lecturas registradas en los corrales accesibles"
        action={
          <Link href={'/comederos' as Route}>
            <Button variant="secondary" size="md"><ArrowLeft className="h-4 w-4" />Volver</Button>
          </Link>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !data?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={History} title="Sin lecturas" description="No hay lecturas registradas todavía" />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Grupo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Corral</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Operador</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(l.fechaLectura)}</td>
                  <td className="px-4 py-3.5">{l.corral.grupoCorrales.nombre}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-foreground font-medium">{l.corral.nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">{l.corral.codigo}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: l.estadoConfig.color ?? '#94a3b8' }}
                      />
                      <span style={{ color: l.estadoConfig.color ?? undefined }} className="font-medium">
                        {l.estadoConfig.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {l.registradoPor.nombre} {l.registradoPor.apellido ?? ''}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {l.notas ? <span className="line-clamp-1">{l.notas}</span> : '—'}
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
