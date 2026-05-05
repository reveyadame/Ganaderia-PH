import { ForbiddenException } from '@nestjs/common'
import { TipoUsuario, UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * IDs de GruposCorrales que el usuario puede ver/operar:
 * - SUPERUSUARIO: todos los grupos activos de la organización
 * - DIRECTOR / OPERADOR: los grupos asignados a su usuario, intersectados con los activos de la organización
 *
 * Una lista vacía significa "sin acceso" — los servicios deben retornar
 * resultado vacío en vez de leakear datos sin filtrar.
 */
export async function getGruposCorralesAccesibles(
  prisma: PrismaService,
  user: UsuarioSesion,
): Promise<string[]> {
  if (user.tipo === TipoUsuario.SUPERUSUARIO) {
    const grupos = await prisma.grupoCorrales.findMany({
      where: { organizacionId: user.organizacionId, activo: true },
      select: { id: true },
    })
    return grupos.map(g => g.id)
  }

  if (!user.gruposCorralesIds.length) return []

  const grupos = await prisma.grupoCorrales.findMany({
    where: {
      id: { in: user.gruposCorralesIds },
      organizacionId: user.organizacionId,
      activo: true,
    },
    select: { id: true },
  })
  return grupos.map(g => g.id)
}

/**
 * Lanza ForbiddenException si el usuario no tiene acceso al grupo.
 */
export async function assertGrupoCorralesAccess(
  prisma: PrismaService,
  user: UsuarioSesion,
  grupoCorralesId: string,
): Promise<void> {
  const accesibles = await getGruposCorralesAccesibles(prisma, user)
  if (!accesibles.includes(grupoCorralesId)) {
    throw new ForbiddenException('No tienes acceso a este grupo de corrales')
  }
}

/**
 * Resuelve el grupoCorralesId a usar como filtro:
 * - Si el usuario solicita uno específico → valida que tenga acceso
 * - Si no solicita ninguno → retorna `{ in: accesibles }` para limitar a los suyos
 *
 * Devuelve `null` si el usuario no tiene grupos accesibles (servicio debe responder vacío).
 */
export async function resolverFiltroGrupos(
  prisma: PrismaService,
  user: UsuarioSesion,
  grupoCorralesIdSolicitado?: string,
): Promise<{ filter: string | { in: string[] } } | null> {
  const accesibles = await getGruposCorralesAccesibles(prisma, user)
  if (accesibles.length === 0) return null

  if (grupoCorralesIdSolicitado) {
    if (!accesibles.includes(grupoCorralesIdSolicitado)) {
      throw new ForbiddenException('No tienes acceso a este grupo de corrales')
    }
    return { filter: grupoCorralesIdSolicitado }
  }

  return { filter: { in: accesibles } }
}
