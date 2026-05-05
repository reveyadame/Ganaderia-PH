import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateNotificacionDto } from './dto/create-notificacion.dto'
import { TipoUsuario, PrioridadNotificacion, UsuarioSesion } from '@ganaderia/shared'

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  // ─── Crear ───────────────────────────────────────────────
  async create(dto: CreateNotificacionDto, autor: UsuarioSesion) {
    if (autor.tipo !== TipoUsuario.SUPERUSUARIO && autor.tipo !== TipoUsuario.DIRECTOR) {
      throw new ForbiddenException('Solo SUPERUSUARIO o DIRECTOR pueden enviar notificaciones')
    }

    const destinatarios = await this.prisma.usuario.findMany({
      where: {
        id: { in: dto.destinatariosIds },
        organizacionId: autor.organizacionId,
        activo: true,
      },
      include: { gruposCorrales: true },
    })

    if (destinatarios.length !== dto.destinatariosIds.length) {
      throw new BadRequestException('Algunos destinatarios no existen o están inactivos')
    }

    if (autor.tipo === TipoUsuario.DIRECTOR) {
      const gruposDirector = new Set(autor.gruposCorralesIds)
      if (gruposDirector.size === 0) {
        throw new ForbiddenException('No tienes grupos de corrales asignados para enviar notificaciones')
      }
      const fueraDeArea = destinatarios.filter(
        (u) => !u.gruposCorrales.some((g) => gruposDirector.has(g.grupoCorralesId)),
      )
      if (fueraDeArea.length > 0) {
        throw new ForbiddenException(
          `No puedes enviar a operadores fuera de tus grupos: ${fueraDeArea.map((u) => u.email).join(', ')}`,
        )
      }
    }

    return this.prisma.notificacion.create({
      data: {
        organizacionId: autor.organizacionId,
        autorId: autor.id,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        prioridad: dto.prioridad ?? PrioridadNotificacion.INFO,
        expiraEn: dto.expiraEn ? new Date(dto.expiraEn) : null,
        destinatarios: {
          create: dto.destinatariosIds.map((usuarioId) => ({ usuarioId })),
        },
      },
      include: {
        autor: { select: { id: true, nombre: true, apellido: true } },
        destinatarios: { include: { usuario: { select: { id: true, nombre: true, apellido: true, email: true } } } },
      },
    })
  }

  // ─── Listar las mías (destinatario) ──────────────────────
  async listarMias(usuario: UsuarioSesion) {
    const ahora = new Date()
    const filas = await this.prisma.notificacionDestinatario.findMany({
      where: {
        usuarioId: usuario.id,
        notificacion: {
          organizacionId: usuario.organizacionId,
          OR: [{ expiraEn: null }, { expiraEn: { gt: ahora } }],
        },
      },
      include: {
        notificacion: {
          include: { autor: { select: { id: true, nombre: true, apellido: true } } },
        },
      },
      orderBy: { notificacion: { createdAt: 'desc' } },
    })

    const lecturas = await this.prisma.notificacionLectura.findMany({
      where: { usuarioId: usuario.id, notificacionId: { in: filas.map((f) => f.notificacionId) } },
    })
    const lecturaPorNotif = new Map(lecturas.map((l) => [l.notificacionId, l]))

    return filas.map((f) => {
      const l = lecturaPorNotif.get(f.notificacionId)
      return {
        id: f.notificacion.id,
        titulo: f.notificacion.titulo,
        mensaje: f.notificacion.mensaje,
        prioridad: f.notificacion.prioridad,
        expiraEn: f.notificacion.expiraEn,
        createdAt: f.notificacion.createdAt,
        autor: f.notificacion.autor,
        leidaEn: l?.leidaEn ?? null,
        confirmadaEn: l?.confirmadaEn ?? null,
      }
    })
  }

  // ─── Marcar como leída ───────────────────────────────────
  async marcarLeida(notificacionId: string, usuario: UsuarioSesion) {
    const destinatario = await this.prisma.notificacionDestinatario.findFirst({
      where: { notificacionId, usuarioId: usuario.id },
    })
    if (!destinatario) throw new NotFoundException('Notificación no encontrada')

    const ahora = new Date()
    return this.prisma.notificacionLectura.upsert({
      where: { notificacionId_usuarioId: { notificacionId, usuarioId: usuario.id } },
      create: { notificacionId, usuarioId: usuario.id, leidaEn: ahora },
      update: { leidaEn: ahora },
    })
  }

  // ─── Confirmar (CRITICA) ─────────────────────────────────
  async confirmar(notificacionId: string, usuario: UsuarioSesion) {
    const destinatario = await this.prisma.notificacionDestinatario.findFirst({
      where: { notificacionId, usuarioId: usuario.id },
      include: { notificacion: true },
    })
    if (!destinatario) throw new NotFoundException('Notificación no encontrada')

    return this.prisma.notificacionLectura.upsert({
      where: { notificacionId_usuarioId: { notificacionId, usuarioId: usuario.id } },
      create: { notificacionId, usuarioId: usuario.id, confirmadaEn: new Date() },
      update: { confirmadaEn: new Date() },
    })
  }

  // ─── Listar emitidas (autor) ─────────────────────────────
  async listarEmitidas(autor: UsuarioSesion) {
    const where =
      autor.tipo === TipoUsuario.SUPERUSUARIO
        ? { organizacionId: autor.organizacionId }
        : { organizacionId: autor.organizacionId, autorId: autor.id }

    const notifs = await this.prisma.notificacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        autor: { select: { id: true, nombre: true, apellido: true } },
        _count: { select: { destinatarios: true, lecturas: true } },
      },
    })

    const ids = notifs.map((n) => n.id)
    const confirmadasPorNotif = await this.prisma.notificacionLectura.groupBy({
      by: ['notificacionId'],
      where: { notificacionId: { in: ids }, confirmadaEn: { not: null } },
      _count: { _all: true },
    })
    const confirmMap = new Map(confirmadasPorNotif.map((g) => [g.notificacionId, g._count._all]))

    return notifs.map((n) => ({
      id: n.id,
      titulo: n.titulo,
      mensaje: n.mensaje,
      prioridad: n.prioridad,
      expiraEn: n.expiraEn,
      createdAt: n.createdAt,
      autor: n.autor,
      destinatariosCount: n._count.destinatarios,
      leidasCount: n._count.lecturas,
      confirmadasCount: confirmMap.get(n.id) ?? 0,
    }))
  }

  // ─── Detalle (autor) ─────────────────────────────────────
  async detalle(notificacionId: string, autor: UsuarioSesion) {
    const notif = await this.prisma.notificacion.findFirst({
      where: {
        id: notificacionId,
        organizacionId: autor.organizacionId,
        ...(autor.tipo === TipoUsuario.SUPERUSUARIO ? {} : { autorId: autor.id }),
      },
      include: {
        autor: { select: { id: true, nombre: true, apellido: true } },
        destinatarios: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
          },
        },
        lecturas: true,
        _count: { select: { destinatarios: true, lecturas: true } },
      },
    })
    if (!notif) throw new NotFoundException('Notificación no encontrada')

    const lecturaMap = new Map(notif.lecturas.map((l) => [l.usuarioId, l]))

    const destinatarios = notif.destinatarios.map((d) => {
      const l = lecturaMap.get(d.usuarioId)
      return {
        usuario: d.usuario,
        leidaEn: l?.leidaEn ?? null,
        confirmadaEn: l?.confirmadaEn ?? null,
      }
    })

    return {
      id: notif.id,
      titulo: notif.titulo,
      mensaje: notif.mensaje,
      prioridad: notif.prioridad,
      expiraEn: notif.expiraEn,
      createdAt: notif.createdAt,
      autor: notif.autor,
      destinatariosCount: notif._count.destinatarios,
      leidasCount: notif._count.lecturas,
      confirmadasCount: destinatarios.filter((d) => d.confirmadaEn).length,
      destinatarios,
    }
  }

  // ─── Eliminar (autor o superuser) ────────────────────────
  async remove(id: string, autor: UsuarioSesion) {
    const notif = await this.prisma.notificacion.findFirst({
      where: { id, organizacionId: autor.organizacionId },
    })
    if (!notif) throw new NotFoundException('Notificación no encontrada')

    if (autor.tipo !== TipoUsuario.SUPERUSUARIO && notif.autorId !== autor.id) {
      throw new ForbiddenException('Solo el autor puede eliminar esta notificación')
    }

    await this.prisma.notificacion.delete({ where: { id } })
    return { ok: true }
  }
}
