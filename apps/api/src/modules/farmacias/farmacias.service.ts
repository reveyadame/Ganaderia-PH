import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateFarmaciaDto } from './dto/create-farmacia.dto'
import { UpdateFarmaciaDto } from './dto/update-farmacia.dto'

@Injectable()
export class FarmaciasService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string) {
    return this.prisma.farmacia.findMany({
      where: { organizacionId },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { gruposCorrales: true, medicamentos: true } },
      },
    })
  }

  async findOne(id: string, organizacionId: string) {
    const farmacia = await this.prisma.farmacia.findFirst({
      where: { id, organizacionId },
      include: {
        gruposCorrales: { where: { activo: true }, orderBy: { nombre: 'asc' } },
        _count: { select: { medicamentos: true } },
      },
    })
    if (!farmacia) throw new NotFoundException('Farmacia no encontrada')
    return farmacia
  }

  async create(dto: CreateFarmaciaDto, organizacionId: string) {
    const existe = await this.prisma.farmacia.findFirst({
      where: { organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' } },
    })
    if (existe) throw new ConflictException('Ya existe una farmacia con ese nombre')

    return this.prisma.farmacia.create({
      data: { ...dto, organizacionId },
    })
  }

  async update(id: string, dto: UpdateFarmaciaDto, organizacionId: string) {
    await this.findOne(id, organizacionId)

    if (dto.nombre) {
      const existe = await this.prisma.farmacia.findFirst({
        where: { organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' }, NOT: { id } },
      })
      if (existe) throw new ConflictException('Ya existe una farmacia con ese nombre')
    }

    return this.prisma.farmacia.update({ where: { id }, data: dto })
  }

  async remove(id: string, organizacionId: string) {
    await this.findOne(id, organizacionId)

    const tieneGrupos = await this.prisma.grupoCorrales.count({
      where: { farmaciaId: id, activo: true },
    })
    if (tieneGrupos > 0) {
      throw new ConflictException('No se puede eliminar la farmacia: tiene grupos de corrales activos asignados')
    }

    return this.prisma.farmacia.update({ where: { id }, data: { activa: false } })
  }
}
