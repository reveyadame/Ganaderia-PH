import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ActividadUsuario, TipoUsuario, UsuarioSesion } from '@ganaderia/shared'
import { ACTIVIDAD_KEY } from '../decorators/requiere-actividad.decorator'

const ROLES_SIN_RESTRICCION = [TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR]

@Injectable()
export class ActividadGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const actividadesRequeridas = this.reflector.getAllAndOverride<ActividadUsuario[]>(
      ACTIVIDAD_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!actividadesRequeridas || actividadesRequeridas.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const usuario = request.user as UsuarioSesion

    if (ROLES_SIN_RESTRICCION.includes(usuario.tipo)) {
      return true
    }

    const tieneActividad = actividadesRequeridas.some((a) =>
      usuario.actividades.includes(a),
    )

    if (!tieneActividad) {
      throw new ForbiddenException('No tienes acceso a este módulo')
    }

    return true
  }
}
