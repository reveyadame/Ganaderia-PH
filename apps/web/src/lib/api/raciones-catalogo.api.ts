import { api } from './client'

export interface RacionCatalogoItem {
  id: string
  organizacionId: string
  nombre: string
  descripcion: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
  _count?: { definiciones: number }
}

export interface CreateRacionCatalogoInput {
  nombre: string
  descripcion?: string
}

export type UpdateRacionCatalogoInput = Partial<CreateRacionCatalogoInput>

export const racionesCatalogoApi = {
  findAll: () => api.get<RacionCatalogoItem[]>('/raciones-catalogo'),
  create: (data: CreateRacionCatalogoInput) => api.post<RacionCatalogoItem>('/raciones-catalogo', data),
  update: (id: string, data: UpdateRacionCatalogoInput) => api.put<RacionCatalogoItem>(`/raciones-catalogo/${id}`, data),
  remove: (id: string) => api.delete<RacionCatalogoItem>(`/raciones-catalogo/${id}`),
}
