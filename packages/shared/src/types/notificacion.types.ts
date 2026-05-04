import { PrioridadNotificacion } from '../enums'

export interface NotificacionDestinatarioBasico {
  id: string
  nombre: string
  apellido: string
  email: string
}

export interface NotificacionMia {
  id: string
  titulo: string
  mensaje: string
  prioridad: PrioridadNotificacion
  expiraEn: string | null
  createdAt: string
  autor: { id: string; nombre: string; apellido: string }
  leidaEn: string | null
  confirmadaEn: string | null
}

export interface NotificacionEmitida {
  id: string
  titulo: string
  mensaje: string
  prioridad: PrioridadNotificacion
  expiraEn: string | null
  createdAt: string
  autor: { id: string; nombre: string; apellido: string }
  destinatariosCount: number
  leidasCount: number
  confirmadasCount: number
}

export interface NotificacionDetalle extends NotificacionEmitida {
  destinatarios: Array<{
    usuario: NotificacionDestinatarioBasico
    leidaEn: string | null
    confirmadaEn: string | null
  }>
}
