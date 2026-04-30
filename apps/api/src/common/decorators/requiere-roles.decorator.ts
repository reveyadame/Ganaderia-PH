import { SetMetadata } from '@nestjs/common'
import { TipoUsuario } from '@ganaderia/shared'

export const ROLES_KEY = 'roles'
export const RequiereRoles = (...roles: TipoUsuario[]) =>
  SetMetadata(ROLES_KEY, roles)
