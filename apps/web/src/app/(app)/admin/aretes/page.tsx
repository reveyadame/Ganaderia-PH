'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { CattleIcon } from '@/components/icons/cattle-icon'
import { aretesApi } from '@/lib/api/aretes.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

type ModoAlta = 'individual' | 'lote'

export default function AretesPage() {
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState<'' | 'DISPONIBLE' | 'ASIGNADO'>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [modo, setModo] = useState<ModoAlta>('individual')
  const [codigoSingle, setCodigoSingle] = useState('')
  const [codigosLote, setCodigosLote] = useState('')

  const { data: aretes, isLoading } = useQuery({
    queryKey: ['aretes', filtroEstado],
    queryFn: () => aretesApi.findAll(filtroEstado || undefined),
  })

  const createSingleMutation = useMutation({
    mutationFn: () => aretesApi.create(codigoSingle.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aretes'] })
      qc.invalidateQueries({ queryKey: ['aretes-disponibles'] })
      toast('success', `Arete "${codigoSingle}" agregado al pool`)
      setCodigoSingle('')
      setDialogOpen(false)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const createLoteMutation = useMutation({
    mutationFn: () => {
      const codigos = codigosLote.split('\n').map(c => c.trim()).filter(Boolean)
      return aretesApi.createLote(codigos)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['aretes'] })
      qc.invalidateQueries({ queryKey: ['aretes-disponibles'] })
      toast('success', `${data.creados} aretes agregados al pool`)
      setCodigosLote('')
      setDialogOpen(false)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: aretesApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aretes'] })
      toast('success', 'Arete eliminado del pool')
      setDeleteTarget(null)
    },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'No se puede eliminar'),
  })

  const disponibles = aretes?.filter(a => a.estado === 'DISPONIBLE').length ?? 0
  const asignados = aretes?.filter(a => a.estado === 'ASIGNADO').length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pool de Aretes Blancos"
        description="Gestión del inventario de aretes operativos reutilizables"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar aretes
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total en pool', value: (aretes?.length ?? 0).toString(), color: '' },
          { label: 'Disponibles', value: disponibles.toString(), color: 'text-green-500' },
          { label: 'Asignados', value: asignados.toString(), color: 'text-blue-500' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color || 'text-foreground'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value as '' | 'DISPONIBLE' | 'ASIGNADO')}
          options={[
            { value: '', label: 'Todos los aretes' },
            { value: 'DISPONIBLE', label: 'Disponibles' },
            { value: 'ASIGNADO', label: 'Asignados' },
          ]}
          className="w-44"
        />
      </div>

      {/* Tabla */}
      {isLoading ? <TableSkeleton rows={5} cols={4} /> : !aretes?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Tag}
            title="Pool vacío"
            description="Agrega aretes blancos para poder asignarlos a los animales al registrar su llegada"
            action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" />Agregar aretes</Button>}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Código</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Animal asignado</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {aretes.map((a) => {
                const animalActual = a.asignaciones[0]?.animal
                return (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{a.codigo}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={a.estado === 'DISPONIBLE' ? 'success' : 'info'}>
                        {a.estado === 'DISPONIBLE' ? 'Disponible' : 'Asignado'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {animalActual ? (
                        <div className="flex items-center gap-2 text-sm">
                          <CattleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground">
                            {animalActual.areteSiniiga ?? '(sin SINIIGA)'}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{animalActual.corral?.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {a.estado === 'DISPONIBLE' && (
                        <button
                          onClick={() => setDeleteTarget(a.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog alta */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Agregar aretes al pool" size="md">
        <div className="space-y-4">
          {/* Tabs modo */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {(['individual', 'lote'] as ModoAlta[]).map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  modo === m ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'individual' ? 'Individual' : 'Varios a la vez'}
              </button>
            ))}
          </div>

          {modo === 'individual' ? (
            <Input
              label="Código del arete"
              value={codigoSingle}
              onChange={e => setCodigoSingle(e.target.value)}
              placeholder="Ej: A-042"
              hint="Código que aparece físicamente en el arete"
            />
          ) : (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Códigos (uno por línea)</label>
              <textarea
                value={codigosLote}
                onChange={e => setCodigosLote(e.target.value)}
                placeholder={'A-001\nA-002\nA-003\n...'}
                rows={8}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {codigosLote.split('\n').filter(c => c.trim()).length} códigos ingresados
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              loading={createSingleMutation.isPending || createLoteMutation.isPending}
              onClick={() => modo === 'individual' ? createSingleMutation.mutate() : createLoteMutation.mutate()}
            >
              Agregar al pool
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending}
        title="Eliminar arete"
        description="¿Eliminar este arete del pool? Solo se puede eliminar si está disponible."
        confirmLabel="Eliminar"
      />
    </div>
  )
}
