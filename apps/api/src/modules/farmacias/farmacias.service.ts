import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TipoUsuario, UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateFarmaciaDto } from './dto/create-farmacia.dto'
import { UpdateFarmaciaDto } from './dto/update-farmacia.dto'
import { getFarmaciasAccesibles, assertFarmaciaAccess } from '../../common/utils/farmacia-access.util'

@Injectable()
export class FarmaciasService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: UsuarioSesion) {
    const accesibles = await getFarmaciasAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    return this.prisma.farmacia.findMany({
      where: { organizacionId: user.organizacionId, id: { in: accesibles } },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { gruposCorrales: true } },
      },
    })
  }

  async findOne(id: string, user: UsuarioSesion) {
    await assertFarmaciaAccess(this.prisma, user, id)
    const farmacia = await this.prisma.farmacia.findFirst({
      where: { id, organizacionId: user.organizacionId },
      include: {
        gruposCorrales: { where: { activo: true }, orderBy: { nombre: 'asc' } },
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

  async update(id: string, dto: UpdateFarmaciaDto, user: UsuarioSesion) {
    await this.findOne(id, user)

    if (dto.nombre) {
      const existe = await this.prisma.farmacia.findFirst({
        where: { organizacionId: user.organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' }, NOT: { id } },
      })
      if (existe) throw new ConflictException('Ya existe una farmacia con ese nombre')
    }

    return this.prisma.farmacia.update({ where: { id }, data: dto })
  }

  async remove(id: string, user: UsuarioSesion) {
    await this.findOne(id, user)

    const tieneGrupos = await this.prisma.grupoCorrales.count({
      where: { farmaciaId: id, activo: true },
    })
    if (tieneGrupos > 0) {
      throw new ConflictException('No se puede eliminar la farmacia: tiene grupos de corrales activos asignados')
    }

    return this.prisma.farmacia.update({ where: { id }, data: { activa: false } })
  }
}
