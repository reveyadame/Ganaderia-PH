import { api } from './client'
import type { NotificacionMia, NotificacionEmitida, NotificacionDetalle, PrioridadNotificacion } from '@ganaderia/shared'

export interface CreateNotificacionInput {
  titulo: string
  mensaje: string
  prioridad?: PrioridadNotificacion
  destinatariosIds: string[]
  expiraEn?: string
}

export const notificacionesApi = {
  listarMias: () => api.get<NotificacionMia[]>('/notificaciones/mias'),
  marcarLeida: (id: string) => api.patch<unknown>(`/notificaciones/${id}/leer`, {}),
  confirmar: (id: string) => api.patch<unknown>(`/notificaciones/${id}/confirmar`, {}),

  // Autor
  listarEmitidas: () => api.get<NotificacionEmitida[]>('/notificaciones'),
  detalle: (id: string) => api.get<NotificacionDetalle>(`/notificaciones/${id}`),
  create: (data: CreateNotificacionInput) => api.post<NotificacionEmitida>('/notificaciones', data),
  remove: (id: string) => api.delete<{ ok: true }>(`/notificaciones/${id}`),
}
