'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { inventarioApi } from '@/lib/api/inventario.api'
import { medicamentosApi } from '@/lib/api/medicamentos.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { FarmaciaSwitcher, SinFarmaciasMensaje, useFarmaciaActiva } from '@/components/farmacia/farmacia-switcher'

export default function HistorialAjustesPage() {
  const { farmaciaActivaId: farmaciaId, farmaciaActiva, hasAccess, isLoading: loadingFarmacias } = useFarmaciaActiva()

  const [medicamentoId, setMedicamentoId] = useState('')
  const [page, setPage] = useState(1)

  const { data: medicamentos } = useQuery({
    queryKey: ['medicamentos', farmaciaId],
    queryFn: () => medicamentosApi.findAll(farmaciaId),
    enabled: !!farmaciaId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['inventario-ajustes', farmaciaId, medicamentoId, page],
    queryFn: () => inventarioApi.getAjustes({
      farmaciaId,
      medicamentoId: medicamentoId || undefined,
      page,
    }),
    enabled: !!farmaciaId,
  })

  const medOptions = [
    { value: '', label: 'Todos los medicamentos' },
    ...(medicamentos?.map((m) => ({ value: m.id, label: m.nombre })) ?? []),
  ]

  if (!loadingFarmacias && !hasAccess) {
    return (
      <div className="space-y-5">
        <PageHeader title="Historial de ajustes" description="Auditoría de ajustes manuales de inventario" />
        <SinFarmaciasMensaje />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historial de ajustes"
        description={farmaciaActiva ? `Ajustes registrados en ${farmaciaActiva.nombre}` : 'Auditoría de ajustes manuales de inventario'}
        action={<FarmaciaSwitcher />}
      />

      <div className="flex flex-wrap gap-3">
        <Select
          options={medOptions}
          value={medicamentoId}
          onChange={(e) => { setMedicamentoId(e.target.value); setPage(1) }}
          className="w-72"
        />
        {data && <span className="text-sm text-muted-foreground self-center">{data.total} ajustes</span>}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={History}
            title="Sin ajustes"
            description="Aún no se han registrado ajustes manuales de inventario"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Fecha', 'Medicamento', 'Antes', 'Después', 'Δ', 'Costo unitario', 'Justificación', 'Realizado por'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(a.fechaAjuste)}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{a.medicamento.nombre}</p>
                      <p className="text-xs text-muted-foreground">{a.medicamento.presentacion}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{a.cantidadAnterior}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground">{a.cantidadNueva}</td>
                    <td className="px-4 py-3.5">
                      {a.delta > 0 ? (
                        <Badge variant="success" className="text-[11px] gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          +{a.delta}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[11px] gap-1">
                          <ArrowDownRight className="h-3 w-3" />
                          {a.delta}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {a.costoUnitario ? formatCurrency(Number(a.costoUnitario)) : <span className="text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs max-w-md">
                      <span className="line-clamp-2">{a.justificacion}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {a.realizadoPor.nombre} {a.realizadoPor.apellido}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Página {data.page} de {data.totalPages} · {data.total} ajustes</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={page >= (data.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
