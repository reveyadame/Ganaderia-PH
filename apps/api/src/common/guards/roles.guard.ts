import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { TipoUsuario, UsuarioSesion } from '@ganaderia/shared'
import { ROLES_KEY } from '../decorators/requiere-roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<TipoUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const usuario = request.user as UsuarioSesion

    if (rolesRequeridos.includes(usuario.tipo)) {
      return true
    }

    throw new ForbiddenException('No tienes permisos para realizar esta acción')
  }
}
