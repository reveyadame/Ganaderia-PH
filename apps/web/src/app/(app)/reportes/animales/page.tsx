'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, PawPrint } from 'lucide-react'
import { reportesApi, CostoAnimalItem } from '@/lib/api/reportes.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { corralesApi } from '@/lib/api/corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

function formatMXN(val: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
}

export default function ReporteAnimalesPage() {
  const router = useRouter()
  const [grupoCorralesId, setGrupoCorralesId] = useState('')
  const [corralId, setCorralId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaInput, setBusquedaInput] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const { data: grupos } = useQuery({
    queryKey: ['grupos-corrales'],
    queryFn: gruposCorralesApi.findAll,
    select: gs => gs.filter(g => g.activo),
  })

  const { data: corrales } = useQuery({
    queryKey: ['corrales', grupoCorralesId],
    queryFn: () => corralesApi.findAll(grupoCorralesId || undefined),
    enabled: !!grupoCorralesId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-costo-animal', grupoCorralesId, corralId, busqueda, page],
    queryFn: () =>
      reportesApi.getCostoAnimal({
        page,
        limit: LIMIT,
        grupoCorralesId: grupoCorralesId || undefined,
        corralId: corralId || undefined,
        busqueda: busqueda || undefined,
      }),
  })

  const grupoOptions = [
    { value: '', label: 'Todos los grupos' },
    ...(grupos?.map(g => ({ value: g.id, label: g.nombre })) ?? []),
  ]

  const corralOptions = [
    { value: '', label: 'Todos los corrales' },
    ...(corrales?.filter(c => c.activo).map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` })) ?? []),
  ]

  const handleBuscar = () => {
    setBusqueda(busquedaInput)
    setPage(1)
  }

  const handleGrupoChange = (id: string) => {
    setGrupoCorralesId(id)
    setCorralId('')
    setPage(1)
  }

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
          title="Costo por animal"
          description="Costo acumulado de tratamientos por animal activo"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={grupoOptions}
          value={grupoCorralesId}
          onChange={e => handleGrupoChange(e.target.value)}
          className="w-48"
        />
        {grupoCorralesId && (
          <Select
            options={corralOptions}
            value={corralId}
            onChange={e => { setCorralId(e.target.value); setPage(1) }}
            className="w-48"
          />
        )}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por arete..."
            value={busquedaInput}
            onChange={e => setBusquedaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBuscar()}
            className="w-48"
          />
          <Button variant="secondary" onClick={handleBuscar}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground ml-auto">
            {data.total.toLocaleString('es-MX')} animales
          </span>
        )}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={PawPrint} title="Sin resultados" description="No hay animales con los filtros seleccionados" />
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Arete SINIIGA</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Arete blanco</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Corral</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tratamientos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Costo total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((a: CostoAnimalItem) => (
                  <tr
                    key={a.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/animales/${a.id}`)}
                  >
                    <td className="px-4 py-3">
                      {a.areteSiniiga ? (
                        <span className="font-mono text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                          {a.areteSiniiga}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.areteBlanco ? (
                        <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                          {a.areteBlanco}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">{a.corral.codigo}</div>
                      <div className="text-xs text-muted-foreground">{a.corral.grupoCorrales.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.tratamientosCount > 0 ? (
                        <Badge variant="info">{a.tratamientosCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={a.costoTotal > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                        {formatMXN(a.costoTotal)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
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
