import { api } from './client'
import { TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  tipo: TipoUsuario
  activo: boolean
  ultimoAcceso: string | null
  createdAt: string
  actividades: { actividad: ActividadUsuario }[]
  gruposCorrales: { grupoCorralesId: string; grupoCorrales: { nombre: string } }[]
}

export interface CreateUsuarioInput {
  nombre: string
  apellido: string
  email: string
  password: string
  tipo: TipoUsuario
  actividades?: ActividadUsuario[]
  gruposCorralesIds?: string[]
}

export interface UpdateUsuarioInput {
  nombre?: string
  apellido?: string
  email?: string
  password?: string
  tipo?: TipoUsuario
  activo?: boolean
}

export const usuariosApi = {
  findAll: () => api.get<Usuario[]>('/usuarios'),
  findOne: (id: string) => api.get<Usuario>(`/usuarios/${id}`),
  create: (data: CreateUsuarioInput) => api.post<Usuario>('/usuarios', data),
  update: (id: string, data: UpdateUsuarioInput) => api.put<Usuario>(`/usuarios/${id}`, data),
  asignarActividades: (id: string, actividades: ActividadUsuario[]) =>
    api.put<Usuario>(`/usuarios/${id}/actividades`, { actividades }),
  asignarGrupos: (id: string, gruposCorralesIds: string[]) =>
    api.put<Usuario>(`/usuarios/${id}/grupos-corrales`, { gruposCorralesIds }),
  remove: (id: string) => api.delete<Usuario>(`/usuarios/${id}`),
}
