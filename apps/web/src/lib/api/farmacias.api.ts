import { api } from './client'

export interface Farmacia {
  id: string
  nombre: string
  descripcion: string | null
  activa: boolean
  createdAt: string
  _count: { gruposCorrales: number; medicamentos: number }
}

export interface FarmaciaDetalle extends Farmacia {
  gruposCorrales: { id: string; nombre: string; activo: boolean }[]
}

export interface CreateFarmaciaInput {
  nombre: string
  descripcion?: string
}

export interface UpdateFarmaciaInput extends Partial<CreateFarmaciaInput> {
  activa?: boolean
}

export const farmaciasApi = {
  findAll: () => api.get<Farmacia[]>('/farmacias'),
  findOne: (id: string) => api.get<FarmaciaDetalle>(`/farmacias/${id}`),
  create: (data: CreateFarmaciaInput) => api.post<Farmacia>('/farmacias', data),
  update: (id: string, data: UpdateFarmaciaInput) => api.put<Farmacia>(`/farmacias/${id}`, data),
  remove: (id: string) => api.delete<Farmacia>(`/farmacias/${id}`),
}
