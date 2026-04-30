'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MapPin, Pencil, Trash2, ChevronRight, Building2 } from 'lucide-react'
import { gruposCorralesApi, GrupoCorrales, CreateGrupoCorralesInput } from '@/lib/api/grupos-corrales.api'
import { corralesApi, Corral, CreateCorralInput } from '@/lib/api/corrales.api'
import { farmaciasApi } from '@/lib/api/farmacias.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge, ActiveBadge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'

type Tab = 'grupos' | 'corrales'

export default function CorralesPage() {
  const [tab, setTab] = useState<Tab>('grupos')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estructura de Corrales"
        description="Grupos de corrales y corrales individuales"
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {([['grupos', 'Grupos de Corrales'], ['corrales', 'Corrales']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'grupos' ? <GruposTab /> : <CorralesTab />}
    </div>
  )
}

function GruposTab() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GrupoCorrales | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GrupoCorrales | null>(null)
  const [form, setForm] = useState({ nombre: '', farmaciaId: '', descripcion: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: grupos, isLoading } = useQuery({ queryKey: ['grupos-corrales'], queryFn: gruposCorralesApi.findAll })
  const { data: farmacias } = useQuery({ queryKey: ['farmacias'], queryFn: farmaciasApi.findAll })

  const farmaciaOptions = farmacias?.filter(f => f.activa).map(f => ({ value: f.id, label: f.nombre })) ?? []

  const createMutation = useMutation({
    mutationFn: gruposCorralesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grupos-corrales'] }); toast('success', 'Grupo creado'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateGrupoCorralesInput }) => gruposCorralesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grupos-corrales'] }); toast('success', 'Grupo actualizado'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: gruposCorralesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grupos-corrales'] }); toast('success', 'Grupo desactivado'); setDeleteTarget(null) },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'No se puede desactivar'),
  })

  const openCreate = () => { setEditTarget(null); setForm({ nombre: '', farmaciaId: '', descripcion: '' }); setErrors({}); setDialogOpen(true) }
  const openEdit = (g: GrupoCorrales) => { setEditTarget(g); setForm({ nombre: g.nombre, farmaciaId: g.farmaciaId, descripcion: g.descripcion ?? '' }); setErrors({}); setDialogOpen(true) }
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null) }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs['nombre'] = 'Requerido'
    if (!form.farmaciaId) errs['farmaciaId'] = 'Selecciona una farmacia'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const data = { nombre: form.nombre.trim(), farmaciaId: form.farmaciaId, descripcion: form.descripcion || undefined }
    editTarget ? updateMutation.mutate({ id: editTarget.id, data }) : createMutation.mutate(data)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Grupo</Button>
      </div>

      {isLoading ? <TableSkeleton rows={4} cols={4} /> : !grupos?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={Building2} title="Sin grupos registrados" description="Los grupos de corrales agrupan corrales por ubicación"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Grupo</Button>} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Farmacia</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Corrales</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {grupos.map((g) => (
                <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand shrink-0" />
                      <span className="font-medium text-foreground">{g.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{g.farmacia.nombre}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="muted">{g._count.corrales} corral{g._count.corrales !== 1 ? 'es' : ''}</Badge>
                  </td>
                  <td className="px-4 py-3.5"><ActiveBadge activo={g.activo} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(g)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} title={editTarget ? 'Editar grupo' : 'Nuevo grupo de corrales'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} error={errors['nombre']} placeholder="Corrales Matriz" required />
          <Select label="Farmacia" value={form.farmaciaId} onChange={e => setForm({ ...form, farmaciaId: e.target.value })} options={farmaciaOptions} placeholder="Selecciona una farmacia" error={errors['farmaciaId']} required />
          <Input label="Descripción" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{editTarget ? 'Guardar cambios' : 'Crear grupo'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending} title="Desactivar grupo"
        description={`¿Desactivar "${deleteTarget?.nombre}"? Solo es posible si no tiene animales activos.`}
        confirmLabel="Desactivar" />
    </>
  )
}

function CorralesTab() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Corral | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Corral | null>(null)
  const [form, setForm] = useState({ codigo: '', nombre: '', grupoCorralesId: '', capacidad: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: corrales, isLoading } = useQuery({ queryKey: ['corrales'], queryFn: () => corralesApi.findAll() })
  const { data: grupos } = useQuery({ queryKey: ['grupos-corrales'], queryFn: gruposCorralesApi.findAll })

  const grupoOptions = grupos?.filter(g => g.activo).map(g => ({ value: g.id, label: g.nombre })) ?? []

  const createMutation = useMutation({
    mutationFn: corralesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corrales'] }); toast('success', 'Corral creado'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCorralInput }) => corralesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corrales'] }); toast('success', 'Corral actualizado'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: corralesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corrales'] }); toast('success', 'Corral desactivado'); setDeleteTarget(null) },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'No se puede desactivar'),
  })

  const openCreate = () => { setEditTarget(null); setForm({ codigo: '', nombre: '', grupoCorralesId: '', capacidad: '' }); setErrors({}); setDialogOpen(true) }
  const openEdit = (c: Corral) => { setEditTarget(c); setForm({ codigo: c.codigo, nombre: c.nombre, grupoCorralesId: c.grupoCorralesId, capacidad: c.capacidad?.toString() ?? '' }); setErrors({}); setDialogOpen(true) }
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null) }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.codigo.trim()) errs['codigo'] = 'Requerido'
    if (!/^[A-Z0-9\-_]+$/.test(form.codigo.toUpperCase())) errs['codigo'] = 'Solo mayúsculas, números, guiones'
    if (!form.nombre.trim()) errs['nombre'] = 'Requerido'
    if (!form.grupoCorralesId) errs['grupoCorralesId'] = 'Selecciona un grupo'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const data: CreateCorralInput = {
      codigo: form.codigo.toUpperCase().trim(),
      nombre: form.nombre.trim(),
      grupoCorralesId: form.grupoCorralesId,
      capacidad: form.capacidad ? parseInt(form.capacidad) : undefined,
    }
    editTarget ? updateMutation.mutate({ id: editTarget.id, data }) : createMutation.mutate(data)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Corral</Button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={5} /> : !corrales?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={MapPin} title="Sin corrales registrados" description="Los corrales son las unidades físicas donde se alojan los animales"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Corral</Button>} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Código</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Grupo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cap / Animales</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {corrales.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-foreground">{c.codigo}</code>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">{c.nombre}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ChevronRight className="h-3 w-3" />
                      {c.grupoCorrales.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {c._count.animales} / {c.capacidad ?? '—'}
                  </td>
                  <td className="px-4 py-3.5"><ActiveBadge activo={c.activo} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} title={editTarget ? 'Editar corral' : 'Nuevo corral'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} error={errors['codigo']} placeholder="C-01" required />
            <Input label="Capacidad (cabezas)" type="number" value={form.capacidad} onChange={e => setForm({ ...form, capacidad: e.target.value })} placeholder="50" />
          </div>
          <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} error={errors['nombre']} placeholder="Corral 01" required />
          <Select label="Grupo de Corrales" value={form.grupoCorralesId} onChange={e => setForm({ ...form, grupoCorralesId: e.target.value })} options={grupoOptions} placeholder="Selecciona un grupo" error={errors['grupoCorralesId']} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>{editTarget ? 'Guardar cambios' : 'Crear corral'}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending} title="Desactivar corral"
        description={`¿Desactivar "${deleteTarget?.nombre}"? Solo es posible si no tiene animales activos.`}
        confirmLabel="Desactivar" />
    </>
  )
}
