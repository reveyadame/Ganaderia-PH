import { api } from './client'

export interface AreteBlanco {
  id: string
  codigo: string
  estado: 'DISPONIBLE' | 'ASIGNADO'
  asignaciones: {
    animal: {
      id: string
      areteSiniiga: string | null
      sexo: string
      corral: { id: string; nombre: string }
    } | null
  }[]
}

export interface AreteBlancoDisponible {
  id: string
  codigo: string
}

export const aretesApi = {
  findAll: (estado?: 'DISPONIBLE' | 'ASIGNADO') => {
    const qs = estado ? `?estado=${estado}` : ''
    return api.get<AreteBlanco[]>(`/aretes${qs}`)
  },
  getDisponibles: () => api.get<AreteBlancoDisponible[]>('/aretes/disponibles'),
  create: (codigo: string) => api.post<AreteBlanco>('/aretes', { codigo }),
  createLote: (codigos: string[]) =>
    api.post<{ creados: number; codigos: string[] }>('/aretes/lote', { codigos }),
  remove: (id: string) => api.delete<AreteBlanco>(`/aretes/${id}`),
}
