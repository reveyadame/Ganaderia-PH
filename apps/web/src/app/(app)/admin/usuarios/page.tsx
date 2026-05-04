'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { usuariosApi, Usuario, CreateUsuarioInput } from '@/lib/api/usuarios.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge, ActiveBadge } from '@/components/ui/badge'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

const TIPO_OPTIONS = [
  { value: TipoUsuario.SUPERUSUARIO, label: 'Superusuario' },
  { value: TipoUsuario.DIRECTOR, label: 'Director' },
  { value: TipoUsuario.OPERADOR, label: 'Operador' },
]

const ACTIVIDAD_LABELS: Record<ActividadUsuario, string> = {
  [ActividadUsuario.REGISTRO]: 'Registro de animales',
  [ActividadUsuario.TRATAMIENTOS]: 'Tratamientos',
  [ActividadUsuario.COMEDEROS]: 'Lecturas de comedero',
  [ActividadUsuario.RACIONES]: 'Surtido de raciones',
  [ActividadUsuario.FARMACIA]: 'Farmacia',
  [ActividadUsuario.REPORTES]: 'Reportes',
}

const ACTIVIDADES_OPERADOR: ActividadUsuario[] = [
  ActividadUsuario.REGISTRO,
  ActividadUsuario.TRATAMIENTOS,
  ActividadUsuario.COMEDEROS,
  ActividadUsuario.RACIONES,
]

const TIPO_BADGE: Record<TipoUsuario, React.ReactNode> = {
  [TipoUsuario.SUPERUSUARIO]: <Badge variant="info">Superusuario</Badge>,
  [TipoUsuario.DIRECTOR]: <Badge variant="success">Director</Badge>,
  [TipoUsuario.OPERADOR]: <Badge variant="muted">Operador</Badge>,
}

type DialogMode = 'create' | 'edit' | 'permisos' | null

export default function UsuariosPage() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<DialogMode>(null)
  const [target, setTarget] = useState<Usuario | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null)

  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', tipo: TipoUsuario.OPERADOR as TipoUsuario })
  const [selectedActividades, setSelectedActividades] = useState<ActividadUsuario[]>([])
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: usuarios, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: usuariosApi.findAll })
  const { data: grupos } = useQuery({ queryKey: ['grupos-corrales'], queryFn: gruposCorralesApi.findAll })

  const createMutation = useMutation({
    mutationFn: usuariosApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); toast('success', 'Usuario creado'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof usuariosApi.update>[1] }) =>
      usuariosApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); toast('success', 'Usuario actualizado'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const permisosMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await usuariosApi.asignarActividades(id, selectedActividades)
      await usuariosApi.asignarGrupos(id, selectedGrupos)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); toast('success', 'Permisos actualizados'); closeDialog() },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: usuariosApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); toast('success', 'Usuario desactivado'); setDeleteTarget(null) },
    onError: (e: { message?: string }) => toast('error', e.message ?? 'Error'),
  })

  const openCreate = () => {
    setTarget(null)
    setForm({ nombre: '', apellido: '', email: '', password: '', tipo: TipoUsuario.OPERADOR })
    setSelectedActividades([])
    setSelectedGrupos([])
    setErrors({})
    setMode('create')
  }

  const openEdit = (u: Usuario) => {
    setTarget(u)
    setForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, password: '', tipo: u.tipo })
    setErrors({})
    setMode('edit')
  }

  const openPermisos = (u: Usuario) => {
    setTarget(u)
    setSelectedActividades(u.actividades.map(a => a.actividad))
    setSelectedGrupos(u.gruposCorrales.map(g => g.grupoCorralesId))
    setMode('permisos')
  }

  const closeDialog = () => { setMode(null); setTarget(null) }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs['nombre'] = 'Requerido'
    if (!form.apellido.trim()) errs['apellido'] = 'Requerido'
    if (!form.email.trim()) errs['email'] = 'Requerido'
    if (mode === 'create' && form.password.length < 8) errs['password'] = 'Mínimo 8 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmitDatos = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (mode === 'create') {
      const data: CreateUsuarioInput = {
        nombre: form.nombre.trim(), apellido: form.apellido.trim(),
        email: form.email.trim(), password: form.password,
        tipo: form.tipo,
        actividades: selectedActividades.length ? selectedActividades : undefined,
        gruposCorralesIds: selectedGrupos.length ? selectedGrupos : undefined,
      }
      createMutation.mutate(data)
    } else if (target) {
      const data: Parameters<typeof usuariosApi.update>[1] = {
        nombre: form.nombre.trim(), apellido: form.apellido.trim(),
        email: form.email.trim(), tipo: form.tipo,
        ...(form.password ? { password: form.password } : {}),
      }
      updateMutation.mutate({ id: target.id, data })
    }
  }

  const toggleActividad = (a: ActividadUsuario) =>
    setSelectedActividades(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const toggleGrupo = (id: string) =>
    setSelectedGrupos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const isOperador = form.tipo === TipoUsuario.OPERADOR
  const isDirector = form.tipo === TipoUsuario.DIRECTOR
  const necesitaActividades = isOperador || isDirector
  const actividadesDisponibles = isOperador
    ? Object.entries(ACTIVIDAD_LABELS).filter(([key]) => ACTIVIDADES_OPERADOR.includes(key as ActividadUsuario))
    : Object.entries(ACTIVIDAD_LABELS)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestión de cuentas y permisos de acceso al sistema"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Usuario</Button>}
      />

      {isLoading ? <TableSkeleton rows={5} cols={5} /> : !usuarios?.length ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState icon={Users} title="Sin usuarios" description="Crea el primer usuario del sistema"
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo Usuario</Button>} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actividades</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Último acceso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-medium text-foreground">{u.nombre} {u.apellido}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">{TIPO_BADGE[u.tipo]}</td>
                  <td className="px-4 py-3.5">
                    {u.tipo === TipoUsuario.SUPERUSUARIO ? (
                      <span className="text-xs text-muted-foreground">Acceso completo</span>
                    ) : u.actividades.length ? (
                      <div className="flex flex-wrap gap-1">
                        {u.actividades.slice(0, 2).map(a => (
                          <Badge key={a.actividad} variant="muted" className="text-[10px]">{a.actividad}</Badge>
                        ))}
                        {u.actividades.length > 2 && <Badge variant="muted" className="text-[10px]">+{u.actividades.length - 2}</Badge>}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Sin actividades</span>}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {u.ultimoAcceso ? formatDateTime(u.ultimoAcceso) : '—'}
                  </td>
                  <td className="px-4 py-3.5"><ActiveBadge activo={u.activo} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {u.tipo !== TipoUsuario.SUPERUSUARIO && (
                        <button onClick={() => openPermisos(u)} title="Gestionar permisos"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={mode === 'create' || mode === 'edit'} onClose={closeDialog}
        title={mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'} size="lg">
        <form onSubmit={handleSubmitDatos} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} error={errors['nombre']} required />
            <Input label="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} error={errors['apellido']} required />
          </div>
          <Input label="Correo electrónico" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} error={errors['email']} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={mode === 'edit' ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              error={errors['password']} placeholder={mode === 'edit' ? '••••••••' : 'Mínimo 8 caracteres'} required={mode === 'create'} />
            <Select label="Tipo de usuario" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoUsuario })} options={TIPO_OPTIONS} required />
          </div>

          {/* Actividades y grupos para OPERADOR y DIRECTOR en creación */}
          {mode === 'create' && necesitaActividades && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actividades permitidas</p>
              <div className="grid grid-cols-2 gap-2">
                {actividadesDisponibles.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedActividades.includes(key as ActividadUsuario)}
                      onChange={() => toggleActividad(key as ActividadUsuario)}
                      className="w-4 h-4 rounded border-border accent-brand" />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
              {grupos?.filter(g => g.activo).length ? (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grupos de corrales</p>
                  <div className="grid grid-cols-2 gap-2">
                    {grupos.filter(g => g.activo).map(g => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedGrupos.includes(g.id)}
                          onChange={() => toggleGrupo(g.id)}
                          className="w-4 h-4 rounded border-border accent-brand" />
                        <span className="text-sm text-foreground">{g.nombre}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Permisos Dialog */}
      <Dialog open={mode === 'permisos'} onClose={closeDialog}
        title={`Permisos — ${target?.nombre} ${target?.apellido}`}
        description="Actividades permitidas y grupos de corrales asignados"
        size="lg">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Actividades</p>
            <div className="grid grid-cols-2 gap-2">
              {(target?.tipo === TipoUsuario.OPERADOR
                ? Object.entries(ACTIVIDAD_LABELS).filter(([key]) => ACTIVIDADES_OPERADOR.includes(key as ActividadUsuario))
                : Object.entries(ACTIVIDAD_LABELS)
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedActividades.includes(key as ActividadUsuario)}
                    onChange={() => toggleActividad(key as ActividadUsuario)}
                    className="w-4 h-4 rounded border-border accent-brand" />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {grupos?.filter(g => g.activo).length ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Grupos de Corrales</p>
              <div className="grid grid-cols-2 gap-2">
                {grupos.filter(g => g.activo).map(g => (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedGrupos.includes(g.id)}
                      onChange={() => toggleGrupo(g.id)}
                      className="w-4 h-4 rounded border-border accent-brand" />
                    <span className="text-sm text-foreground">{g.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => target && permisosMutation.mutate({ id: target.id })}
              loading={permisosMutation.isPending}>Guardar permisos</Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending} title="Desactivar usuario"
        description={`¿Desactivar a "${deleteTarget?.nombre} ${deleteTarget?.apellido}"? No podrá iniciar sesión.`}
        confirmLabel="Desactivar" />
    </div>
  )
}
