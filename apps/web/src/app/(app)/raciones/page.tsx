'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import { Scale, Settings, Plus, Pencil, History, MapPin } from 'lucide-react'
import { racionesApi, RacionDefinicion } from '@/lib/api/raciones.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

export default function RacionesAdminPage() {
  const qc = useQueryClient()
  const { data: activas, isLoading } = useQuery({
    queryKey: ['raciones-activas'],
    queryFn: racionesApi.listarActivas,
  })

  const [editTarget, setEditTarget] = useState<RacionDefinicion | null>(null)
  const [mananaKg, setMananaKg] = useState(0)
  const [tardeKg, setTardeKg] = useState(0)

  const editMutation = useMutation({
    mutationFn: ({ id, m, t }: { id: string; m: number; t: number }) =>
      racionesApi.actualizarCantidades(id, m, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['raciones-activas'] })
      qc.invalidateQueries({ queryKey: ['comederos-resumen'] })
      toast('success', 'Cantidades actualizadas')
      setEditTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const openEdit = (r: RacionDefinicion) => {
    setEditTarget(r)
    setMananaKg(Number(r.cantidadKgManana))
    setTardeKg(Number(r.cantidadKgTarde))
  }

  // Group by GrupoCorrales
  const grouped = (activas ?? []).reduce<Record<string, { nombre: string; raciones: RacionDefinicion[] }>>((acc, r) => {
    const key = r.corral?.grupoCorrales?.id ?? 'sin'
    const nombre = r.corral?.grupoCorrales?.nombre ?? 'Sin grupo'
    if (!acc[key]) acc[key] = { nombre, raciones: [] }
    acc[key].raciones.push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raciones activas"
        description="Resumen de la ración vigente en cada corral"
        action={
          <div className="flex items-center gap-2">
            <Link href={'/raciones/historial' as Route}>
              <Button variant="secondary" size="md"><History className="h-4 w-4" />Historial</Button>
            </Link>
            <Link href={'/raciones/definir' as Route}>
              <Button size="md"><Plus className="h-4 w-4" />Definir ración</Button>
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : !activas?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Scale}
            title="Sin raciones activas"
            description="Define la primera ración para tus corrales"
            action={
              <Link href={'/raciones/definir' as Route}>
                <Button><Plus className="h-4 w-4" />Definir ración</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, { nombre, raciones }]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground tracking-tight">{nombre}</h2>
                <Badge variant="muted" className="text-[10px]">{raciones.length}</Badge>
              </div>

              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Corral</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ración</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Mañana</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarde</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                      <th className="px-4 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {raciones.map((r) => {
                      const total = Number(r.cantidadKgManana) + Number(r.cantidadKgTarde)
                      return (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-foreground">{r.corral?.nombre ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">{r.corral?.codigo ?? ''}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium text-foreground">{r.nombre}</p>
                            {r.descripcion && <p className="text-xs text-muted-foreground line-clamp-1">{r.descripcion}</p>}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums font-mono text-sm">{Number(r.cantidadKgManana)} kg</td>
                          <td className="px-4 py-3.5 text-right tabular-nums font-mono text-sm">{Number(r.cantidadKgTarde)} kg</td>
                          <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-foreground">{total} kg</td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => openEdit(r)}
                              title="Ajustar cantidades"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Ajustar cantidades — ${editTarget?.corral?.nombre ?? ''}`}
        description={`Ración: ${editTarget?.nombre ?? ''} (no se puede cambiar el tipo aquí)`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="☀️ Mañana (kg)"
              type="number"
              min={0}
              step={0.5}
              value={mananaKg}
              onChange={(e) => setMananaKg(Number(e.target.value))}
            />
            <Input
              label="🌙 Tarde (kg)"
              type="number"
              min={0}
              step={0.5}
              value={tardeKg}
              onChange={(e) => setTardeKg(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button
              loading={editMutation.isPending}
              onClick={() => editTarget && editMutation.mutate({ id: editTarget.id, m: mananaKg, t: tardeKg })}
            >
              Guardar cantidades
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
