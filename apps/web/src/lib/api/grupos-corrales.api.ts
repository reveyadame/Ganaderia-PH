import { api } from './client'

export interface GrupoCorrales {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  farmaciaId: string
  farmacia: { id: string; nombre: string }
  createdAt: string
  _count: { corrales: number }
}

export interface GrupoCorralesDetalle extends Omit<GrupoCorrales, '_count'> {
  corrales: { id: string; nombre: string; codigo: string; activo: boolean }[]
}

export interface CreateGrupoCorralesInput {
  nombre: string
  farmaciaId: string
  descripcion?: string
}

export interface UpdateGrupoCorralesInput extends Partial<CreateGrupoCorralesInput> {
  activo?: boolean
}

export const gruposCorralesApi = {
  findAll: () => api.get<GrupoCorrales[]>('/grupos-corrales'),
  findOne: (id: string) => api.get<GrupoCorralesDetalle>(`/grupos-corrales/${id}`),
  create: (data: CreateGrupoCorralesInput) => api.post<GrupoCorrales>('/grupos-corrales', data),
  update: (id: string, data: UpdateGrupoCorralesInput) => api.put<GrupoCorrales>(`/grupos-corrales/${id}`, data),
  remove: (id: string) => api.delete<GrupoCorrales>(`/grupos-corrales/${id}`),
}
