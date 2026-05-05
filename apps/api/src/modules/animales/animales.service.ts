import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { Prisma } from '@ganaderia/database'
import { UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateAnimalDto } from './dto/create-animal.dto'
import { EgresoAnimalDto } from './dto/egreso-animal.dto'
import { CreateLoteDto } from './dto/create-lote.dto'
import { QueryAnimalesDto } from './dto/query-animales.dto'
import { getGruposCorralesAccesibles, resolverFiltroGrupos } from '../../common/utils/grupos-corrales-access.util'

const ANIMAL_INCLUDE = {
  corral: {
    select: {
      id: true, nombre: true, codigo: true,
      grupoCorrales: { select: { id: true, nombre: true, farmaciaId: true } },
    },
  },
  lote: { select: { id: true, codigo: true, procedencia: true } },
  asignacionesArete: {
    where: { fechaLiberacion: null },
    take: 1,
    include: { areteBlanco: { select: { id: true, codigo: true } } },
  },
} satisfies Prisma.AnimalInclude

@Injectable()
export class AnimalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: UsuarioSesion, query: QueryAnimalesDto) {
    const { page = 1, limit = 50, search, corralId, grupoCorralesId, sexo, estado = 'ACTIVO' } = query
    const skip = (page - 1) * limit

    const filtro = await resolverFiltroGrupos(this.prisma, user, grupoCorralesId)
    if (!filtro) return { data: [], total: 0, page, limit, totalPages: 0 }

    const where: Prisma.AnimalWhereInput = {
      organizacionId: user.organizacionId,
      estado,
      ...(sexo && { sexo }),
      ...(corralId && { corralId }),
      corral: { grupoCorralesId: filtro.filter },
      ...(search && {
        OR: [
          { areteSiniiga: { contains: search, mode: 'insensitive' } },
          { asignacionesArete: { some: { fechaLiberacion: null, areteBlanco: { codigo: { contains: search, mode: 'insensitive' } } } } },
        ],
      }),
    }

    const [animales, total] = await this.prisma.$transaction([
      this.prisma.animal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaEntrada: 'desc' },
        include: ANIMAL_INCLUDE,
      }),
      this.prisma.animal.count({ where }),
    ])

    const ids = animales.map((a) => a.id)
    const costos = await this.prisma.aplicacionTratamiento.groupBy({
      by: ['animalId'],
      where: { animalId: { in: ids } },
      _sum: { costoTotalCalculado: true },
    })
    const costoMap = Object.fromEntries(costos.map((c) => [c.animalId, Number(c._sum.costoTotalCalculado ?? 0)]))

    const data = animales.map((a) => ({
      ...a,
      costoAcumulado: costoMap[a.id] ?? 0,
      areteBlancoActual: a.asignacionesArete[0]?.areteBlanco ?? null,
    }))

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(id: string, user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new NotFoundException('Animal no encontrado')

    const animal = await this.prisma.animal.findFirst({
      where: {
        id,
        organizacionId: user.organizacionId,
        corral: { grupoCorralesId: { in: accesibles } },
      },
      include: {
        ...ANIMAL_INCLUDE,
        asignacionesArete: {
          orderBy: { fechaAsignacion: 'desc' },
          take: 5,
          include: { areteBlanco: { select: { id: true, codigo: true } } },
        },
        aplicaciones: {
          orderBy: { fechaAplicacion: 'desc' },
          take: 10,
          include: {
            aplicadoPor: { select: { id: true, nombre: true, apellido: true } },
            template: { select: { id: true, nombre: true } },
            items: { include: { medicamento: { select: { id: true, nombre: true, unidadMedida: true } } } },
          },
        },
      },
    })
    if (!animal) throw new NotFoundException('Animal no encontrado')

    const costoResult = await this.prisma.aplicacionTratamiento.aggregate({
      where: { animalId: id },
      _sum: { costoTotalCalculado: true },
    })

    return {
      ...animal,
      costoAcumulado: Number(costoResult._sum.costoTotalCalculado ?? 0),
      areteBlancoActual: animal.asignacionesArete.find((a) => !a.fechaLiberacion)?.areteBlanco ?? null,
    }
  }

  async create(dto: CreateAnimalDto, user: UsuarioSesion) {
    // Validar corral está en un grupo accesible para el usuario
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new ForbiddenException('Sin acceso a grupos de corrales')

    const corral = await this.prisma.corral.findFirst({
      where: {
        id: dto.corralId,
        activo: true,
        grupoCorrales: { organizacionId: user.organizacionId, id: { in: accesibles } },
      },
    })
    if (!corral) throw new BadRequestException('Corral no encontrado o sin acceso')

    // Validar unicidad SINIIGA
    if (dto.areteSiniiga) {
      const existe = await this.prisma.animal.findFirst({
        where: { organizacionId: user.organizacionId, areteSiniiga: dto.areteSiniiga },
      })
      if (existe) throw new ConflictException(`El arete SINIIGA "${dto.areteSiniiga}" ya está registrado`)
    }

    // Validar arete blanco disponible
    if (dto.areteBlancoId) {
      const arete = await this.prisma.areteBlanco.findFirst({
        where: { id: dto.areteBlancoId, organizacionId: user.organizacionId, estado: 'DISPONIBLE' },
      })
      if (!arete) throw new BadRequestException('Arete blanco no disponible o no encontrado')
    }

    const animal = await this.prisma.$transaction(async (tx) => {
      const nuevo = await tx.animal.create({
        data: {
          organizacionId: user.organizacionId,
          corralId: dto.corralId,
          loteId: dto.loteId,
          areteSiniiga: dto.areteSiniiga,
          sexo: dto.sexo,
          pesoEntrada: dto.pesoEntrada,
          fechaEntrada: new Date(dto.fechaEntrada),
          notas: dto.notas,
          createdById: user.id,
        },
        include: ANIMAL_INCLUDE,
      })

      if (dto.areteBlancoId) {
        await tx.asignacionAreteBlanco.create({
          data: {
            animalId: nuevo.id,
            areteBlancoId: dto.areteBlancoId,
            asignadoPorId: user.id,
          },
        })
        await tx.areteBlanco.update({
          where: { id: dto.areteBlancoId },
          data: { estado: 'ASIGNADO' },
        })
      }

      return nuevo
    })

    return this.findOne(animal.id, user)
  }

  async egreso(id: string, dto: EgresoAnimalDto, user: UsuarioSesion) {
    const animal = await this.findOne(id, user)
    if (animal.estado !== 'ACTIVO') throw new BadRequestException('El animal no está activo')

    return this.prisma.animal.update({
      where: { id },
      data: {
        estado: dto.causa === 'MUERTE' ? 'MUERTO' : 'EGRESADO',
        fechaEgreso: new Date(dto.fechaEgreso),
        causaEgreso: dto.causa,
        precioVenta: dto.precioVenta,
        notas: dto.notas ?? animal.notas,
      },
      include: ANIMAL_INCLUDE,
    })
  }

  async liberarAreteBlanco(animalId: string, user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new NotFoundException('Animal no encontrado')

    const animal = await this.prisma.animal.findFirst({
      where: {
        id: animalId,
        organizacionId: user.organizacionId,
        corral: { grupoCorralesId: { in: accesibles } },
      },
    })
    if (!animal) throw new NotFoundException('Animal no encontrado')

    const asignacion = await this.prisma.asignacionAreteBlanco.findFirst({
      where: { animalId, fechaLiberacion: null },
    })
    if (!asignacion) throw new BadRequestException('Este animal no tiene arete blanco asignado')

    await this.prisma.$transaction([
      this.prisma.asignacionAreteBlanco.update({
        where: { id: asignacion.id },
        data: { fechaLiberacion: new Date(), liberadoPorId: user.id },
      }),
      this.prisma.areteBlanco.update({
        where: { id: asignacion.areteBlancoId },
        data: { estado: 'DISPONIBLE' },
      }),
    ])

    return { message: 'Arete blanco liberado correctamente' }
  }

  // ── Lotes ────────────────────────────────────────────────────────────────

  async findAllLotes(user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    return this.prisma.lote.findMany({
      where: {
        corral: {
          grupoCorrales: { organizacionId: user.organizacionId },
          grupoCorralesId: { in: accesibles },
        },
      },
      orderBy: { fechaEntrada: 'desc' },
      include: {
        corral: { select: { id: true, nombre: true, grupoCorrales: { select: { id: true, nombre: true } } } },
        _count: { select: { animales: true } },
      },
    })
  }

  async createLote(dto: CreateLoteDto, user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) throw new ForbiddenException('Sin acceso a grupos de corrales')

    const corral = await this.prisma.corral.findFirst({
      where: {
        id: dto.corralId,
        activo: true,
        grupoCorrales: { organizacionId: user.organizacionId, id: { in: accesibles } },
      },
    })
    if (!corral) throw new BadRequestException('Corral no encontrado o sin acceso')

    return this.prisma.lote.create({
      data: {
        corralId: dto.corralId,
        codigo: dto.codigo,
        procedencia: dto.procedencia,
        fechaEntrada: dto.fechaEntrada ? new Date(dto.fechaEntrada) : new Date(),
        numAnimalesEsperados: dto.numAnimalesEsperados,
        createdById: user.id,
      },
      include: {
        corral: { select: { id: true, nombre: true, grupoCorrales: { select: { id: true, nombre: true } } } },
      },
    })
  }
}
