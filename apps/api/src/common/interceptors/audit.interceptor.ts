import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'
import { UsuarioSesion } from '@ganaderia/shared'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const method = request.method
    const usuario = request.user as UsuarioSesion | undefined

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !usuario) {
      return next.handle()
    }

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const entidad = this.extractEntidad(request.url)
          if (!entidad) return

          await this.prisma.auditLog.create({
            data: {
              usuarioId: usuario.id,
              entidad,
              entidadId: (responseData as Record<string, string>)?.id ?? 'unknown',
              accion: this.mapAccion(method),
              datosNuevos: responseData as object,
              ipAddress: request.ip,
            },
          })
        } catch (_) {
          // Audit no debe romper el flujo principal
        }
      }),
    )
  }

  private extractEntidad(url: string): string | null {
    const parts = url.split('/').filter(Boolean)
    return parts[1] ?? null
  }

  private mapAccion(method: string) {
    const map: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    }
    return map[method] ?? 'CREATE'
  }
}
