import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRacionDto } from './dto/create-racion.dto'
import { CreateSurtidoDto } from './dto/create-surtido.dto'

@Injectable()
export class RacionesService {
  constructor(private prisma: PrismaService) {}

  // ── RacionDefinicion ──────────────────────────────────────────────────────

  async getRacionActiva(corralId: string, organizacionId: string) {
    await this.validateCorral(corralId, organizacionId)
    return this.prisma.racionDefinicion.findFirst({
      where: { corralId, activa: true },
      include: {
        corral: { select: { id: true, nombre: true, codigo: true } },
        definidaPor: { select: { id: true, nombre: true } },
        catalogo: { select: { id: true, nombre: true } },
      },
    })
  }

  async listarActivas(organizacionId: string, gruposPermitidosIds?: string[]) {
    return this.prisma.racionDefinicion.findMany({
      where: {
        activa: true,
        corral: {
          grupoCorrales: {
            organizacionId,
            ...(gruposPermitidosIds ? { id: { in: gruposPermitidosIds } } : {}),
          },
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

  async listarHistorial(organizacionId: string, gruposPermitidosIds?: string[], limit = 100) {
    return this.prisma.racionDefinicion.findMany({
      where: {
        corral: {
          grupoCorrales: {
            organizacionId,
            ...(gruposPermitidosIds ? { id: { in: gruposPermitidosIds } } : {}),
          },
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

  async actualizarCantidades(id: string, cantidadKgManana: number, cantidadKgTarde: number, organizacionId: string) {
    const racion = await this.prisma.racionDefinicion.findFirst({
      where: { id, corral: { grupoCorrales: { organizacionId } } },
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

  async getRacionesCorral(corralId: string, organizacionId: string) {
    await this.validateCorral(corralId, organizacionId)
    return this.prisma.racionDefinicion.findMany({
      where: { corralId },
      orderBy: { fechaInicio: 'desc' },
      include: {
        definidaPor: { select: { id: true, nombre: true } },
        _count: { select: { surtidos: true } },
      },
    })
  }

  async crearRacion(dto: CreateRacionDto, definidaPorId: string, organizacionId: string) {
    await this.validateCorral(dto.corralId, organizacionId)

    let nombre = dto.nombre?.trim()
    if (dto.catalogoId) {
      const cat = await this.prisma.racionCatalogo.findFirst({
        where: { id: dto.catalogoId, organizacionId, activo: true },
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
          definidaPorId,
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

  async getSurtidosRecientes(corralId: string, organizacionId: string, limite = 10) {
    await this.validateCorral(corralId, organizacionId)
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

  async registrarSurtido(dto: CreateSurtidoDto, surtidoPorId: string, organizacionId: string) {
    await this.validateCorral(dto.corralId, organizacionId)

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

  private async validateCorral(corralId: string, organizacionId: string) {
    const corral = await this.prisma.corral.findFirst({
      where: { id: corralId, grupoCorrales: { organizacionId } },
    })
    if (!corral) throw new NotFoundException('Corral no encontrado')
    return corral
  }
}
