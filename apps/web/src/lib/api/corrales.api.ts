import { api } from './client'

export interface Corral {
  id: string
  codigo: string
  nombre: string
  capacidad: number | null
  activo: boolean
  grupoCorralesId: string
  grupoCorrales: { id: string; nombre: string }
  createdAt: string
  _count: { animales: number }
}

export interface CreateCorralInput {
  codigo: string
  nombre: string
  grupoCorralesId: string
  capacidad?: number
}

export interface UpdateCorralInput extends Partial<CreateCorralInput> {
  activo?: boolean
}

export const corralesApi = {
  findAll: (grupoCorralesId?: string) => {
    const qs = grupoCorralesId ? `?grupoCorralesId=${grupoCorralesId}` : ''
    return api.get<Corral[]>(`/corrales${qs}`)
  },
  findOne: (id: string) => api.get<Corral>(`/corrales/${id}`),
  create: (data: CreateCorralInput) => api.post<Corral>('/corrales', data),
  update: (id: string, data: UpdateCorralInput) => api.put<Corral>(`/corrales/${id}`, data),
  remove: (id: string) => api.delete<Corral>(`/corrales/${id}`),
}
