import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateGrupoCorralesDto } from './dto/create-grupo-corrales.dto'
import { UpdateGrupoCorralesDto } from './dto/update-grupo-corrales.dto'

@Injectable()
export class GruposCorralesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string, gruposPermitidosIds?: string[]) {
    return this.prisma.grupoCorrales.findMany({
      where: {
        organizacionId,
        ...(gruposPermitidosIds ? { id: { in: gruposPermitidosIds } } : {}),
      },
      orderBy: { nombre: 'asc' },
      include: {
        farmacia: { select: { id: true, nombre: true } },
        _count: { select: { corrales: true } },
      },
    })
  }

  async findOne(id: string, organizacionId: string) {
    const grupo = await this.prisma.grupoCorrales.findFirst({
      where: { id, organizacionId },
      include: {
        farmacia: { select: { id: true, nombre: true } },
        corrales: { where: { activo: true }, orderBy: { nombre: 'asc' } },
      },
    })
    if (!grupo) throw new NotFoundException('Grupo de corrales no encontrado')
    return grupo
  }

  async create(dto: CreateGrupoCorralesDto, organizacionId: string) {
    const farmaciaExiste = await this.prisma.farmacia.findFirst({
      where: { id: dto.farmaciaId, organizacionId, activa: true },
    })
    if (!farmaciaExiste) throw new BadRequestException('Farmacia no encontrada o inactiva')

    const existe = await this.prisma.grupoCorrales.findFirst({
      where: { organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' } },
    })
    if (existe) throw new ConflictException('Ya existe un grupo de corrales con ese nombre')

    return this.prisma.grupoCorrales.create({
      data: { ...dto, organizacionId },
      include: { farmacia: { select: { id: true, nombre: true } } },
    })
  }

  async update(id: string, dto: UpdateGrupoCorralesDto, organizacionId: string) {
    await this.findOne(id, organizacionId)

    if (dto.farmaciaId) {
      const farmaciaExiste = await this.prisma.farmacia.findFirst({
        where: { id: dto.farmaciaId, organizacionId, activa: true },
      })
      if (!farmaciaExiste) throw new BadRequestException('Farmacia no encontrada o inactiva')
    }

    if (dto.nombre) {
      const existe = await this.prisma.grupoCorrales.findFirst({
        where: { organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' }, NOT: { id } },
      })
      if (existe) throw new ConflictException('Ya existe un grupo de corrales con ese nombre')
    }

    return this.prisma.grupoCorrales.update({
      where: { id },
      data: dto,
      include: { farmacia: { select: { id: true, nombre: true } } },
    })
  }

  async remove(id: string, organizacionId: string) {
    await this.findOne(id, organizacionId)

    const tieneAnimales = await this.prisma.animal.count({
      where: { corral: { grupoCorralesId: id }, estado: 'ACTIVO' },
    })
    if (tieneAnimales > 0) {
      throw new ConflictException('No se puede desactivar: tiene animales activos en sus corrales')
    }

    return this.prisma.grupoCorrales.update({ where: { id }, data: { activo: false } })
  }
}
