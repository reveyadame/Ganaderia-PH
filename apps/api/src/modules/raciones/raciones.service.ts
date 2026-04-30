import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
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
          cantidadKgManana: dto.cantidadKgManana,
          cantidadKgTarde: dto.cantidadKgTarde,
          descripcion: dto.descripcion,
        },
        include: {
          corral: { select: { id: true, nombre: true, codigo: true } },
          definidaPor: { select: { id: true, nombre: true } },
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
