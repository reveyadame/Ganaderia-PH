'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Syringe } from 'lucide-react'
import { reportesApi, TratamientoReporteItem } from '@/lib/api/reportes.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

function formatMXN(val: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(val)
}

const RANGOS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
]

export default function ReporteTratamientosPage() {
  const router = useRouter()
  const [grupoCorralesId, setGrupoCorralesId] = useState('')
  const [dias, setDias] = useState('30')
  const [page, setPage] = useState(1)
  const LIMIT = 50

  const { data: grupos } = useQuery({
    queryKey: ['grupos-corrales'],
    queryFn: gruposCorralesApi.findAll,
    select: gs => gs.filter(g => g.activo),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-tratamientos', grupoCorralesId, dias, page],
    queryFn: () => {
      const desde = new Date(Date.now() - parseInt(dias) * 24 * 60 * 60 * 1000).toISOString()
      return reportesApi.getTratamientos({
        desde,
        grupoCorralesId: grupoCorralesId || undefined,
        page,
        limit: LIMIT,
      })
    },
  })

  const grupoOptions = [
    { value: '', label: 'Todos los grupos' },
    ...(grupos?.map(g => ({ value: g.id, label: g.nombre })) ?? []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title="Historial de tratamientos"
          description="Registro de aplicaciones por período"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={RANGOS}
          value={dias}
          onChange={e => { setDias(e.target.value); setPage(1) }}
          className="w-44"
        />
        <Select
          options={grupoOptions}
          value={grupoCorralesId}
          onChange={e => { setGrupoCorralesId(e.target.value); setPage(1) }}
          className="w-48"
        />
        {data && (
          <span className="text-sm text-muted-foreground ml-auto">
            {data.total.toLocaleString('es-MX')} aplicaciones
          </span>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={Syringe} title="Sin resultados" description="No hay tratamientos en el período seleccionado" />
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Animal</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Corral</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kit / Tratamiento</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Costo</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((t: TratamientoReporteItem) => (
                  <tr
                    key={t.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/animales/${t.animal.id}`)}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(t.fechaAplicacion).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {t.animal.areteSiniiga && (
                        <span className="font-mono text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded mr-1">
                          {t.animal.areteSiniiga}
                        </span>
                      )}
                      {t.animal.areteBlanco && (
                        <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                          {t.animal.areteBlanco}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.animal.corral.codigo}</div>
                      <div className="text-xs text-muted-foreground">{t.animal.corral.grupoCorrales.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {t.templateNombre ?? <span className="text-muted-foreground italic">Individual</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatMXN(t.costoTotalCalculado)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p - 1)}
                  disabled={data.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={data.page >= data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
