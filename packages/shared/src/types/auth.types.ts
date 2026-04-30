import { ActividadUsuario, TipoUsuario } from '../enums'

export interface JwtPayload {
  sub: string
  email: string
  tipo: string
  organizacionId: string
}

export interface UsuarioSesion {
  id: string
  nombre: string
  apellido: string
  email: string
  tipo: TipoUsuario
  organizacionId: string
  actividades: ActividadUsuario[]
  gruposCorralesIds: string[]
}

export type UsuarioSesionRaw = Omit<UsuarioSesion, 'tipo' | 'actividades'> & {
  tipo: string
  actividades: string[]
}

export interface TokensResponse {
  accessToken: string
  usuario: UsuarioSesion
}
