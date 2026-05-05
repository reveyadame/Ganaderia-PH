import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRacionDto } from './dto/create-racion.dto'
import { CreateSurtidoDto } from './dto/create-surtido.dto'
import { getGruposCorralesAccesibles } from '../../common/utils/grupos-corrales-access.util'

@Injectable()
export class RacionesService {
  constructor(private prisma: PrismaService) {}

  // ── RacionDefinicion ──────────────────────────────────────────────────────

  async getRacionActiva(corralId: string, user: UsuarioSesion) {
    await this.validateCorral(corralId, user)
    return this.prisma.racionDefinicion.findFirst({
      where: { corralId, activa: true },
      include: {
        corral: { select: { id: true, nombre: true, codigo: true } },
        definidaPor: { select: { id: true, nombre: true } },
        catalogo: { select: { id: true, nombre: true } },
      },
    })
  }

  async listarActivas(user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    return this.prisma.racionDefinicion.findMany({
      where: {
        activa: true,
        corral: {
          grupoCorrales: { organizacionId: user.organizacionId },
          grupoCorralesId: { in: accesibles },
        },
      },
      orderBy: [{ corral: { grupoCorrales: { nombre: 'asc' } } }, { corral: { nombre: 'asc' } }],
      include: {
        corral: {
          select: {
            id: true, nombre: true, codigo: true,
            grupoCorrales: { select: { id: true, nombre: true } },
          },
        },
        definidaPor: { select: { id: true, nombre: true, apellido: true } },
        catalogo: { select: { id: true, nombre: true } },
      },
    })
  }

  async listarHistorial(user: UsuarioSesion, limit = 100) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    return this.prisma.racionDefinicion.findMany({
      where: {
        corral: {
          grupoCorrales: { organizacionId: user.organizacionId },
          grupoCorralesId: { in: accesibles },
        },
      },
      orderBy: { fechaInicio: 'desc' },
      take: limit,
      include: {
        corral: {
          select: {
            id: true, nombre: true, codigo: true,
            grupoCorrales: { select: { id: true, nombre: true } },
          },
        },
        definidaPor: { select: { id: true, nombre: true, apellido: true } },
        catalogo: { select: { id: true, nombre: true } },
      },
    })
  }

  async actualizarCantidades(id: string, cantidadKgManana: number, cantidadKgTarde: number, user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new NotFoundException('Ración no encontrada')

    const racion = await this.prisma.racionDefinicion.findFirst({
      where: {
        id,
        corral: {
          grupoCorrales: { organizacionId: user.organizacionId },
          grupoCorralesId: { in: accesibles },
        },
      },
    })
    if (!racion) throw new NotFoundException('Ración no encontrada')
    if (!racion.activa) throw new BadRequestException('Solo se pueden ajustar cantidades de raciones activas')
    if (cantidadKgManana < 0 || cantidadKgTarde < 0) {
      throw new BadRequestException('Las cantidades deben ser positivas')
    }
    return this.prisma.racionDefinicion.update({
      where: { id },
      data: { cantidadKgManana, cantidadKgTarde },
      include: {
        corral: { select: { id: true, nombre: true, codigo: true } },
        catalogo: { select: { id: true, nombre: true } },
      },
    })
  }

  async getRacionesCorral(corralId: string, user: UsuarioSesion) {
    await this.validateCorral(corralId, user)
    return this.prisma.racionDefinicion.findMany({
      where: { corralId },
      orderBy: { fechaInicio: 'desc' },
      include: {
        definidaPor: { select: { id: true, nombre: true } },
        _count: { select: { surtidos: true } },
      },
    })
  }

  async crearRacion(dto: CreateRacionDto, user: UsuarioSesion) {
    await this.validateCorral(dto.corralId, user)

    let nombre = dto.nombre?.trim()
    if (dto.catalogoId) {
      const cat = await this.prisma.racionCatalogo.findFirst({
        where: { id: dto.catalogoId, organizacionId: user.organizacionId, activo: true },
      })
      if (!cat) throw new BadRequestException('Ración del catálogo no encontrada o inactiva')
      nombre = cat.nombre
    }
    if (!nombre || nombre.length < 2) {
      throw new BadRequestException('Especifica un catalogoId o un nombre válido')
    }

    return this.prisma.$transaction(async tx => {
      // BR-RA-001: cerrar ración activa anterior
      await tx.racionDefinicion.updateMany({
        where: { corralId: dto.corralId, activa: true },
        data: { activa: false, fechaFin: new Date() },
      })

      return tx.racionDefinicion.create({
        data: {
          corralId: dto.corralId,
          definidaPorId: user.id,
          catalogoId: dto.catalogoId ?? null,
          nombre: nombre!,
          cantidadKgManana: dto.cantidadKgManana,
          cantidadKgTarde: dto.cantidadKgTarde,
          descripcion: dto.descripcion,
        },
        include: {
          corral: { select: { id: true, nombre: true, codigo: true } },
          definidaPor: { select: { id: true, nombre: true } },
          catalogo: { select: { id: true, nombre: true } },
        },
      })
    })
  }

  // ── SurtidoRacion ─────────────────────────────────────────────────────────

  async getSurtidosRecientes(corralId: string, user: UsuarioSesion, limite = 10) {
    await this.validateCorral(corralId, user)
    return this.prisma.surtidoRacion.findMany({
      where: { corralId },
      orderBy: { fechaSurtido: 'desc' },
      take: limite,
      include: {
        surtidoPor: { select: { id: true, nombre: true } },
        racionDefinicion: { select: { cantidadKgManana: true, cantidadKgTarde: true } },
      },
    })
  }

  async registrarSurtido(dto: CreateSurtidoDto, user: UsuarioSesion) {
    await this.validateCorral(dto.corralId, user)
    const surtidoPorId = user.id

    // Resolver ración activa si no se proveyó
    let racionDefinicionId = dto.racionDefinicionId
    let cantidadDefinida: number | null = null

    if (!racionDefinicionId) {
      const racion = await this.prisma.racionDefinicion.findFirst({
        where: { corralId: dto.corralId, activa: true },
      })
      if (racion) {
        racionDefinicionId = racion.id
        // BR-RA-004: copiar cantidadDefinida del turno
        cantidadDefinida = dto.turno === 'MANANA'
          ? Number(racion.cantidadKgManana)
          : Number(racion.cantidadKgTarde)
      }
    } else {
      const racion = await this.prisma.racionDefinicion.findUnique({
        where: { id: racionDefinicionId },
      })
      if (racion) {
        cantidadDefinida = dto.turno === 'MANANA'
          ? Number(racion.cantidadKgManana)
          : Number(racion.cantidadKgTarde)
      }
    }

    // BR-RA-005: diferencia = surtida - definida
    const diferencia = cantidadDefinida !== null
      ? dto.cantidadSurtida - cantidadDefinida
      : null

    return this.prisma.surtidoRacion.create({
      data: {
        corralId: dto.corralId,
        racionDefinicionId: racionDefinicionId ?? null,
        surtidoPorId,
        turno: dto.turno,
        cantidadDefinida: cantidadDefinida,
        cantidadSurtida: dto.cantidadSurtida,
        diferencia,
        notas: dto.notas,
      },
      include: {
        corral: { select: { id: true, nombre: true, codigo: true } },
        surtidoPor: { select: { id: true, nombre: true } },
        racionDefinicion: { select: { cantidadKgManana: true, cantidadKgTarde: true, descripcion: true } },
      },
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async validateCorral(corralId: string, user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new NotFoundException('Corral no encontrado')

    const corral = await this.prisma.corral.findFirst({
      where: {
        id: corralId,
        grupoCorrales: { organizacionId: user.organizacionId },
        grupoCorralesId: { in: accesibles },
      },
    })
    if (!corral) throw new NotFoundException('Corral no encontrado')
    return corral
  }
}
