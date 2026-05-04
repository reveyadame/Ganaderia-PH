import { api } from './client'

export interface EstadoComederoConfig {
  id: string
  organizacionId: string
  nombre: string
  orden: number
  color: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
  _count?: { lecturas: number }
}

export interface LecturaComedor {
  id: string
  corralId: string
  estadoConfigId: string
  registradoPorId: string
  fechaLectura: string
  notas: string | null
  estadoConfig: { id: string; nombre: string; color: string | null }
  corral?: { id: string; nombre: string; codigo: string }
  registradoPor: { id: string; nombre: string }
}

export interface EstadoActualCorral {
  id: string
  nombre: string
  codigo: string
  animalesCount: number
  grupoCorrales?: { id: string; nombre: string }
  ultimaLectura: {
    id: string
    fechaLectura: string
    notas: string | null
    estadoConfig: { id: string; nombre: string; color: string | null }
    registradoPor: { id: string; nombre: string }
  } | null
  racionActiva: {
    id: string
    corralId: string
    nombre?: string
    cantidadKgManana: number
    cantidadKgTarde: number
    descripcion?: string | null
    catalogo?: { id: string; nombre: string } | null
  } | null
}

export interface EstadoActualGrupo {
  grupo: { id: string; nombre: string }
  corrales: EstadoActualCorral[]
}

export interface LecturaHistorialItem {
  id: string
  corralId: string
  fechaLectura: string
  notas: string | null
  estadoConfig: { id: string; nombre: string; color: string | null }
  registradoPor: { id: string; nombre: string; apellido?: string }
  corral: {
    id: string; nombre: string; codigo: string
    grupoCorrales: { id: string; nombre: string }
  }
}

export interface CreateEstadoConfigInput {
  nombre: string
  orden?: number
  color?: string
}

export interface CreateLecturaInput {
  corralId: string
  estadoConfigId: string
  notas?: string
}

export const comederoEstadosApi = {
  findAll: () => api.get<EstadoComederoConfig[]>('/comederos/estados'),
  create: (data: CreateEstadoConfigInput) =>
    api.post<EstadoComederoConfig>('/comederos/estados', data),
  update: (id: string, data: Partial<CreateEstadoConfigInput>) =>
    api.put<EstadoComederoConfig>(`/comederos/estados/${id}`, data),
  remove: (id: string) =>
    api.delete<EstadoComederoConfig>(`/comederos/estados/${id}`),
}

export const comederoLecturasApi = {
  registrar: (data: CreateLecturaInput) =>
    api.post<LecturaComedor>('/comederos/lecturas', data),
  getByCorral: (corralId: string, limite?: number) => {
    const qs = new URLSearchParams({ corralId })
    if (limite) qs.set('limite', String(limite))
    return api.get<LecturaComedor[]>(`/comederos/lecturas?${qs}`)
  },
  getEstadoActual: (grupoCorralesId: string) =>
    api.get<EstadoActualGrupo>(`/comederos/estado-actual?grupoCorralesId=${grupoCorralesId}`),
  getResumen: () =>
    api.get<EstadoActualCorral[]>('/comederos/resumen'),
  getHistorial: (limit?: number) =>
    api.get<LecturaHistorialItem[]>(`/comederos/historial${limit ? `?limit=${limit}` : ''}`),
}
