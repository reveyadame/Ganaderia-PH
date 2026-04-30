'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, PawPrint, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { animalesApi, QueryAnimales } from '@/lib/api/animales.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { corralesApi } from '@/lib/api/corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SexoAnimal, EstadoAnimal, CausaEgresoAnimal } from '@ganaderia/shared'

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: EstadoAnimal.ACTIVO, label: 'Activos' },
  { value: EstadoAnimal.EGRESADO, label: 'Egresados' },
  { value: EstadoAnimal.MUERTO, label: 'Muertos' },
  { value: EstadoAnimal.BAJA, label: 'Baja' },
]

const SEXO_OPTIONS = [
  { value: '', label: 'Ambos sexos' },
  { value: SexoAnimal.MACHO, label: '♂ Machos' },
  { value: SexoAnimal.HEMBRA, label: '♀ Hembras' },
]

const CAUSA_OPTIONS = [
  { value: CausaEgresoAnimal.VENTA, label: 'Venta' },
  { value: CausaEgresoAnimal.MUERTE, label: 'Muerte' },
  { value: CausaEgresoAnimal.TRASLADO, label: 'Traslado' },
  { value: CausaEgresoAnimal.OTRO, label: 'Otro' },
]

export default function AnimalesPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const [filters, setFilters] = useState<QueryAnimales>({ estado: EstadoAnimal.ACTIVO, page: 1, limit: 50 })
  const [search, setSearch] = useState('')
  const [egresoTarget, setEgresoTarget] = useState<string | null>(null)
  const [egresoForm, setEgresoForm] = useState({ causa: CausaEgresoAnimal.VENTA, fechaEgreso: new Date().toISOString().split('T')[0], precioVenta: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['animales', filters],
    queryFn: () => animalesApi.findAll(filters),
  })

  const { data: grupos } = useQuery({ queryKey: ['grupos-corrales'], queryFn: gruposCorralesApi.findAll })
  const { data: corrales } = useQuery({
    queryKey: ['corrales', filters.grupoCorralesId],
    queryFn: () => corralesApi.findAll(filters.grupoCorralesId),
  })

  const egresoMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => animalesApi.egreso(id, {
      causa: egresoForm.causa,
      fechaEgreso: egresoForm.fechaEgreso,
      precioVenta: egresoForm.precioVenta ? parseFloat(egresoForm.precioVenta) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animales'] })
      toast('success', 'Egreso registrado correctamente')
      setEgresoTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error al registrar egreso'),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(f => ({ ...f, search: search || undefined, page: 1 }))
  }

  const grupoOptions = [{ value: '', label: 'Todos los grupos' }, ...(grupos?.map(g => ({ value: g.id, label: g.nombre })) ?? [])]
  const corralOptions = [{ value: '', label: 'Todos los corrales' }, ...(corrales?.map(c => ({ value: c.id, label: c.nombre })) ?? [])]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Animales"
        description={data ? `${data.total.toLocaleString()} animales encontrados` : 'Registro de ganado'}
        action={
          <Button onClick={() => router.push('/animales/nuevo')}>
            <Plus className="h-4 w-4" />
            Registrar llegada
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por arete..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">Buscar</Button>
        </form>

        <Select
          options={grupoOptions}
          value={filters.grupoCorralesId ?? ''}
          onChange={e => setFilters(f => ({ ...f, grupoCorralesId: e.target.value || undefined, corralId: undefined, page: 1 }))}
          className="w-44"
        />
        <Select
          options={corralOptions}
          value={filters.corralId ?? ''}
          onChange={e => setFilters(f => ({ ...f, corralId: e.target.value || undefined, page: 1 }))}
          className="w-40"
          disabled={!filters.grupoCorralesId}
        />
        <Select
          options={SEXO_OPTIONS}
          value={filters.sexo ?? ''}
          onChange={e => setFilters(f => ({ ...f, sexo: (e.target.value as SexoAnimal) || undefined, page: 1 }))}
          className="w-36"
        />
        <Select
          options={ESTADO_OPTIONS}
          value={filters.estado ?? ''}
          onChange={e => setFilters(f => ({ ...f, estado: (e.target.value as EstadoAnimal) || undefined, page: 1 }))}
          className="w-36"
        />
      </div>

      {/* Tabla */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={PawPrint}
            title="Sin animales"
            description="Registra la primera llegada de ganado"
            action={<Button onClick={() => router.push('/animales/nuevo')}><Plus className="h-4 w-4" />Registrar llegada</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Arete SINIIGA', 'Arete Blanco', 'Sexo', 'Peso entrada', 'Fecha entrada', 'Corral', 'Costo acum.', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/animales/${a.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      {a.areteSiniiga
                        ? <code className="font-mono text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">{a.areteSiniiga}</code>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      {a.areteBlancoActual
                        ? <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{a.areteBlancoActual.codigo}</code>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={a.sexo === SexoAnimal.MACHO ? 'info' : 'warning'} className="text-[10px]">
                        {a.sexo === SexoAnimal.MACHO ? '♂' : '♀'} {a.sexo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{a.pesoEntrada} kg</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatDate(a.fechaEntrada)}</td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-foreground text-xs">{a.corral.nombre}</p>
                        <p className="text-muted-foreground text-xs">{a.corral.grupoCorrales.nombre}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={a.costoAcumulado > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                        {formatCurrency(a.costoAcumulado)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      {a.estado === EstadoAnimal.ACTIVO && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEgresoTarget(a.id)}
                          className="text-xs text-muted-foreground"
                        >
                          Egresar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {data.totalPages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Página {data.page} de {data.totalPages} · {data.total} animales</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={data.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={data.page >= data.totalPages}
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Egreso Dialog */}
      <Dialog open={!!egresoTarget} onClose={() => setEgresoTarget(null)} title="Registrar egreso" size="sm">
        <div className="space-y-4">
          <Select
            label="Causa de egreso"
            value={egresoForm.causa}
            onChange={e => setEgresoForm(f => ({ ...f, causa: e.target.value as CausaEgresoAnimal }))}
            options={CAUSA_OPTIONS}
            required
          />
          <Input
            label="Fecha de egreso"
            type="date"
            value={egresoForm.fechaEgreso}
            onChange={e => setEgresoForm(f => ({ ...f, fechaEgreso: e.target.value }))}
            required
          />
          {egresoForm.causa === CausaEgresoAnimal.VENTA && (
            <Input
              label="Precio de venta (MXN)"
              type="number"
              step="0.01"
              min="0"
              value={egresoForm.precioVenta}
              onChange={e => setEgresoForm(f => ({ ...f, precioVenta: e.target.value }))}
              placeholder="0.00"
            />
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setEgresoTarget(null)}>Cancelar</Button>
            <Button
              loading={egresoMutation.isPending}
              onClick={() => egresoTarget && egresoMutation.mutate({ id: egresoTarget })}
            >
              Confirmar egreso
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
