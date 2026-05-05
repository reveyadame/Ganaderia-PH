import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateEstadoConfigDto } from './dto/create-estado-config.dto'
import { CreateLecturaDto } from './dto/create-lectura.dto'
import { getGruposCorralesAccesibles, assertGrupoCorralesAccess } from '../../common/utils/grupos-corrales-access.util'

@Injectable()
export class ComederoService {
  constructor(private prisma: PrismaService) {}

  // ── EstadoComederoConfig ──────────────────────────────────────────────────

  async findAllEstados(organizacionId: string) {
    return this.prisma.estadoComederoConfig.findMany({
      where: { organizacionId },
      orderBy: { orden: 'asc' },
      include: { _count: { select: { lecturas: true } } },
    })
  }

  async createEstado(dto: CreateEstadoConfigDto, organizacionId: string) {
    const existe = await this.prisma.estadoComederoConfig.findFirst({
      where: { organizacionId, nombre: dto.nombre },
    })
    if (existe) throw new ConflictException(`Ya existe un estado con el nombre "${dto.nombre}"`)

    return this.prisma.estadoComederoConfig.create({
      data: {
        organizacionId,
        nombre: dto.nombre,
        orden: dto.orden ?? 0,
        color: dto.color,
      },
    })
  }

  async updateEstado(id: string, dto: Partial<CreateEstadoConfigDto>, organizacionId: string) {
    const estado = await this.prisma.estadoComederoConfig.findFirst({
      where: { id, organizacionId },
    })
    if (!estado) throw new NotFoundException('Estado no encontrado')

    if (dto.nombre && dto.nombre !== estado.nombre) {
      const existe = await this.prisma.estadoComederoConfig.findFirst({
        where: { organizacionId, nombre: dto.nombre, id: { not: id } },
      })
      if (existe) throw new ConflictException(`Ya existe un estado con el nombre "${dto.nombre}"`)
    }

    return this.prisma.estadoComederoConfig.update({
      where: { id },
      data: { nombre: dto.nombre, orden: dto.orden, color: dto.color },
    })
  }

  async removeEstado(id: string, organizacionId: string) {
    const estado = await this.prisma.estadoComederoConfig.findFirst({
      where: { id, organizacionId },
      include: { _count: { select: { lecturas: true } } },
    })
    if (!estado) throw new NotFoundException('Estado no encontrado')

    // BR-CO-003: soft delete si tiene lecturas
    if (estado._count.lecturas > 0) {
      return this.prisma.estadoComederoConfig.update({
        where: { id },
        data: { activo: false },
      })
    }

    return this.prisma.estadoComederoConfig.delete({ where: { id } })
  }

  // ── LecturaComedor ────────────────────────────────────────────────────────

  async registrarLectura(dto: CreateLecturaDto, user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new NotFoundException('Corral no encontrado')

    // Validar corral pertenece a la organización y a un grupo accesible
    const corral = await this.prisma.corral.findFirst({
      where: {
        id: dto.corralId,
        grupoCorrales: { organizacionId: user.organizacionId },
        grupoCorralesId: { in: accesibles },
      },
    })
    if (!corral) throw new NotFoundException('Corral no encontrado')

    // Validar que el estado config esté activo y pertenezca a la organización
    const estadoConfig = await this.prisma.estadoComederoConfig.findFirst({
      where: { id: dto.estadoConfigId, organizacionId: user.organizacionId, activo: true },
    })
    if (!estadoConfig) throw new BadRequestException('Estado de comedero no válido o inactivo')

    return this.prisma.lecturaComedor.create({
      data: {
        corralId: dto.corralId,
        estadoConfigId: dto.estadoConfigId,
        registradoPorId: user.id,
        notas: dto.notas,
      },
      include: {
        estadoConfig: { select: { id: true, nombre: true, color: true } },
        corral: { select: { id: true, nombre: true, codigo: true } },
        registradoPor: { select: { id: true, nombre: true } },
      },
    })
  }

  async getLecturasCorral(corralId: string, user: UsuarioSesion, limite = 20) {
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

    return this.prisma.lecturaComedor.findMany({
      where: { corralId },
      orderBy: { fechaLectura: 'desc' },
      take: limite,
      include: {
        estadoConfig: { select: { id: true, nombre: true, color: true } },
        registradoPor: { select: { id: true, nombre: true } },
      },
    })
  }

  async getResumenGlobal(user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    const corrales = await this.prisma.corral.findMany({
      where: {
        activo: true,
        grupoCorrales: { organizacionId: user.organizacionId },
        grupoCorralesId: { in: accesibles },
      },
      orderBy: [{ grupoCorrales: { nombre: 'asc' } }, { nombre: 'asc' }],
      include: {
        grupoCorrales: { select: { id: true, nombre: true } },
        _count: { select: { animales: { where: { estado: 'ACTIVO' } } } },
      },
    })

    const corralIds = corrales.map((c) => c.id)
    if (corralIds.length === 0) return []

    const [ultimasLecturas, racionesActivas] = await Promise.all([
      this.prisma.lecturaComedor.findMany({
        where: { corralId: { in: corralIds } },
        orderBy: { fechaLectura: 'desc' },
        distinct: ['corralId'],
        include: {
          estadoConfig: { select: { id: true, nombre: true, color: true } },
          registradoPor: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.racionDefinicion.findMany({
        where: { corralId: { in: corralIds }, activa: true },
        select: {
          id: true, corralId: true, nombre: true,
          cantidadKgManana: true, cantidadKgTarde: true,
          catalogo: { select: { id: true, nombre: true } },
        },
      }),
    ])

    return corrales.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.codigo,
      animalesCount: c._count.animales,
      grupoCorrales: c.grupoCorrales,
      ultimaLectura: ultimasLecturas.find((l) => l.corralId === c.id) ?? null,
      racionActiva: racionesActivas.find((r) => r.corralId === c.id) ?? null,
    }))
  }

  async listarHistorialLecturas(user: UsuarioSesion, limit = 100) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    return this.prisma.lecturaComedor.findMany({
      where: {
        corral: {
          grupoCorrales: { organizacionId: user.organizacionId },
          grupoCorralesId: { in: accesibles },
        },
      },
      orderBy: { fechaLectura: 'desc' },
      take: limit,
      include: {
        estadoConfig: { select: { id: true, nombre: true, color: true } },
        registradoPor: { select: { id: true, nombre: true, apellido: true } },
        corral: {
          select: {
            id: true, nombre: true, codigo: true,
            grupoCorrales: { select: { id: true, nombre: true } },
          },
        },
      },
    })
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getEstadoActual(grupoCorralesId: string, user: UsuarioSesion) {
    await assertGrupoCorralesAccess(this.prisma, user, grupoCorralesId)

    const grupo = await this.prisma.grupoCorrales.findFirst({
      where: { id: grupoCorralesId, organizacionId: user.organizacionId },
      include: {
        corrales: {
          where: { activo: true },
          orderBy: { nombre: 'asc' },
          include: {
            _count: { select: { animales: { where: { estado: 'ACTIVO' } } } },
          },
        },
      },
    })
    if (!grupo) throw new NotFoundException('Grupo de corrales no encontrado')

    // Obtener última lectura de cada corral
    const corralIds = grupo.corrales.map(c => c.id)

    const ultimasLecturas = await this.prisma.lecturaComedor.findMany({
      where: { corralId: { in: corralIds } },
      orderBy: { fechaLectura: 'desc' },
      distinct: ['corralId'],
      include: {
        estadoConfig: { select: { id: true, nombre: true, color: true } },
        registradoPor: { select: { id: true, nombre: true } },
      },
    })

    const racionesActivas = await this.prisma.racionDefinicion.findMany({
      where: { corralId: { in: corralIds }, activa: true },
      select: {
        id: true, corralId: true,
        cantidadKgManana: true, cantidadKgTarde: true, descripcion: true,
      },
    })

    return {
      grupo: { id: grupo.id, nombre: grupo.nombre },
      corrales: grupo.corrales.map(corral => ({
        id: corral.id,
        nombre: corral.nombre,
        codigo: corral.codigo,
        animalesCount: corral._count.animales,
        ultimaLectura: ultimasLecturas.find(l => l.corralId === corral.id) ?? null,
        racionActiva: racionesActivas.find(r => r.corralId === corral.id) ?? null,
      })),
    }
  }
}
