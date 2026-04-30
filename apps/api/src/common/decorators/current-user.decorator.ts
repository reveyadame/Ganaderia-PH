import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { UsuarioSesion } from '@ganaderia/shared'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioSesion => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as UsuarioSesion
  },
)
