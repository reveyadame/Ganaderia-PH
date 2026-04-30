import { SetMetadata } from '@nestjs/common'
import { ActividadUsuario } from '@ganaderia/shared'

export const ACTIVIDAD_KEY = 'actividad'
export const RequiereActividad = (...actividades: ActividadUsuario[]) =>
  SetMetadata(ACTIVIDAD_KEY, actividades)
