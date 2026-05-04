'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import { UtensilsCrossed, MapPin, History, Pencil, Clock } from 'lucide-react'
import { comederoLecturasApi, EstadoActualCorral } from '@/lib/api/comederos.api'
import { racionesApi } from '@/lib/api/raciones.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'

export default function ComederosAdminPage() {
  const qc = useQueryClient()
  const { data: corrales, isLoading } = useQuery({
    queryKey: ['comederos-resumen'],
    queryFn: comederoLecturasApi.getResumen,
  })

  const [editTarget, setEditTarget] = useState<EstadoActualCorral | null>(null)
  const [mananaKg, setMananaKg] = useState(0)
  const [tardeKg, setTardeKg] = useState(0)

  const editMutation = useMutation({
    mutationFn: ({ id, m, t }: { id: string; m: number; t: number }) =>
      racionesApi.actualizarCantidades(id, m, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comederos-resumen'] })
      qc.invalidateQueries({ queryKey: ['raciones-activas'] })
      toast('success', 'Cantidades actualizadas')
      setEditTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const openEdit = (c: EstadoActualCorral) => {
    if (!c.racionActiva) return
    setEditTarget(c)
    setMananaKg(Number(c.racionActiva.cantidadKgManana))
    setTardeKg(Number(c.racionActiva.cantidadKgTarde))
  }

  // Group by GrupoCorrales
  const grouped = (corrales ?? []).reduce<Record<string, { nombre: string; corrales: EstadoActualCorral[] }>>((acc, c) => {
    const key = c.grupoCorrales?.id ?? 'sin'
    const nombre = c.grupoCorrales?.nombre ?? 'Sin grupo'
    if (!acc[key]) acc[key] = { nombre, corrales: [] }
    acc[key].corrales.push(c)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comederos"
        description="Estado actual del comedero por corral. Ajusta la cantidad de la ración sin cambiar su tipo."
        action={
          <Link href={'/comederos/historial' as Route}>
            <Button variant="secondary" size="md"><History className="h-4 w-4" />Historial</Button>
          </Link>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !corrales?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={UtensilsCrossed} title="Sin corrales" description="Crea grupos y corrales para empezar" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, { nombre, corrales: cs }]) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground tracking-tight">{nombre}</h2>
                <Badge variant="muted" className="text-[10px]">{cs.length}</Badge>
              </div>

              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Corral</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado comedero</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ración</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Mañana / Tarde</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Animales</th>
                      <th className="px-4 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cs.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-foreground">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c.codigo}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {c.ultimaLectura ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: c.ultimaLectura.estadoConfig.color ?? '#94a3b8' }}
                              />
                              <div className="min-w-0">
                                <p
                                  className="text-foreground font-medium"
                                  style={{ color: c.ultimaLectura.estadoConfig.color ?? undefined }}
                                >
                                  {c.ultimaLectura.estadoConfig.nombre}
                                </p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(c.ultimaLectura.fechaLectura)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin lectura</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {c.racionActiva ? (
                            <span className="text-foreground font-medium">{c.racionActiva.nombre ?? '—'}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sin ración</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {c.racionActiva ? (
                            <span className="font-mono tabular-nums text-sm">
                              {Number(c.racionActiva.cantidadKgManana)} / {Number(c.racionActiva.cantidadKgTarde)} kg
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-sm">{c.animalesCount}</td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => openEdit(c)}
                            disabled={!c.racionActiva}
                            title={c.racionActiva ? 'Ajustar cantidades' : 'Sin ración activa'}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
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
        title={`Ajustar cantidades — ${editTarget?.nombre ?? ''}`}
        description={`Ración: ${editTarget?.racionActiva?.nombre ?? ''} (para cambiar el tipo, ve a Raciones → Definir)`}
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
              onClick={() => {
                if (editTarget?.racionActiva) {
                  editMutation.mutate({ id: editTarget.racionActiva.id, m: mananaKg, t: tardeKg })
                }
              }}
            >
              Guardar cantidades
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
