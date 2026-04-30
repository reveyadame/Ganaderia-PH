import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateUsuarioDto } from './dto/create-usuario.dto'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'
import { ActividadUsuario } from '@ganaderia/shared'

const USUARIO_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  tipo: true,
  activo: true,
  ultimoAcceso: true,
  createdAt: true,
  actividades: { select: { actividad: true } },
  gruposCorrales: { select: { grupoCorralesId: true, grupoCorrales: { select: { nombre: true } } } },
} as const

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string) {
    return this.prisma.usuario.findMany({
      where: { organizacionId },
      select: USUARIO_SELECT,
      orderBy: [{ tipo: 'asc' }, { apellido: 'asc' }],
    })
  }

  async findOne(id: string, organizacionId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, organizacionId },
      select: USUARIO_SELECT,
    })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    return usuario
  }

  async create(dto: CreateUsuarioDto, organizacionId: string) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } })
    if (existe) throw new ConflictException('Ya existe un usuario con ese correo')

    if (dto.gruposCorralesIds?.length) {
      await this.validarGrupos(dto.gruposCorralesIds, organizacionId)
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)

    return this.prisma.usuario.create({
      data: {
        organizacionId,
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email.toLowerCase(),
        passwordHash,
        tipo: dto.tipo,
        actividades: dto.actividades?.length
          ? { create: dto.actividades.map((a) => ({ actividad: a })) }
          : undefined,
        gruposCorrales: dto.gruposCorralesIds?.length
          ? { create: dto.gruposCorralesIds.map((id) => ({ grupoCorralesId: id })) }
          : undefined,
      },
      select: USUARIO_SELECT,
    })
  }

  async update(id: string, dto: UpdateUsuarioDto, organizacionId: string) {
    await this.findOne(id, organizacionId)

    if (dto.email) {
      const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() } })
      if (existe && existe.id !== id) throw new ConflictException('Ya existe un usuario con ese correo')
    }

    const data: Record<string, unknown> = { ...dto }
    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 12)
    }
    delete data['password']
    if (dto.email) data['email'] = dto.email.toLowerCase()

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: USUARIO_SELECT,
    })
  }

  async asignarActividades(id: string, actividades: ActividadUsuario[], organizacionId: string) {
    await this.findOne(id, organizacionId)

    await this.prisma.$transaction([
      this.prisma.usuarioActividad.deleteMany({ where: { usuarioId: id } }),
      ...(actividades.length > 0
        ? [this.prisma.usuarioActividad.createMany({
            data: actividades.map((a) => ({ usuarioId: id, actividad: a })),
          })]
        : []),
    ])

    return this.findOne(id, organizacionId)
  }

  async asignarGrupos(id: string, gruposCorralesIds: string[], organizacionId: string) {
    await this.findOne(id, organizacionId)
    if (gruposCorralesIds.length) {
      await this.validarGrupos(gruposCorralesIds, organizacionId)
    }

    await this.prisma.$transaction([
      this.prisma.usuarioGrupoCorrales.deleteMany({ where: { usuarioId: id } }),
      ...(gruposCorralesIds.length > 0
        ? [this.prisma.usuarioGrupoCorrales.createMany({
            data: gruposCorralesIds.map((gId) => ({ usuarioId: id, grupoCorralesId: gId })),
          })]
        : []),
    ])

    return this.findOne(id, organizacionId)
  }

  async remove(id: string, organizacionId: string) {
    await this.findOne(id, organizacionId)
    return this.prisma.usuario.update({ where: { id }, data: { activo: false }, select: USUARIO_SELECT })
  }

  private async validarGrupos(ids: string[], organizacionId: string) {
    const grupos = await this.prisma.grupoCorrales.findMany({
      where: { id: { in: ids }, organizacionId },
      select: { id: true },
    })
    if (grupos.length !== ids.length) {
      throw new BadRequestException('Uno o más grupos de corrales no existen o no pertenecen a esta organización')
    }
  }
}
