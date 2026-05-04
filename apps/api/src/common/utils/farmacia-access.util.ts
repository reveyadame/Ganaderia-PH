import { ForbiddenException } from '@nestjs/common'
import { TipoUsuario, UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Devuelve los IDs de farmacias a las que el usuario tiene acceso administrativo.
 * - SUPERUSUARIO: todas las farmacias activas de la organización
 * - DIRECTOR: derivadas de los grupos de corrales asignados al usuario
 * - OPERADOR: arreglo vacío (sin acceso al espacio administrativo de farmacia)
 */
export async function getFarmaciasAccesibles(
  prisma: PrismaService,
  user: UsuarioSesion,
): Promise<string[]> {
  if (user.tipo === TipoUsuario.SUPERUSUARIO) {
    const farmacias = await prisma.farmacia.findMany({
      where: { organizacionId: user.organizacionId, activa: true },
      select: { id: true },
    })
    return farmacias.map((f) => f.id)
  }

  if (user.tipo === TipoUsuario.DIRECTOR) {
    if (!user.gruposCorralesIds.length) return []
    const grupos = await prisma.grupoCorrales.findMany({
      where: {
        id: { in: user.gruposCorralesIds },
        organizacionId: user.organizacionId,
      },
      select: { farmaciaId: true },
    })
    return Array.from(new Set(grupos.map((g) => g.farmaciaId)))
  }

  return []
}

/**
 * Lanza ForbiddenException si el usuario no puede acceder a la farmacia.
 */
export async function assertFarmaciaAccess(
  prisma: PrismaService,
  user: UsuarioSesion,
  farmaciaId: string,
): Promise<void> {
  const accesibles = await getFarmaciasAccesibles(prisma, user)
  if (!accesibles.includes(farmaciaId)) {
    throw new ForbiddenException('No tienes acceso a esta farmacia')
  }
}
