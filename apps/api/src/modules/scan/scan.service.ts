import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

type ScanContexto = 'ANIMAL' | 'CORRAL' | 'AMBOS'

@Injectable()
export class ScanService {
  constructor(private prisma: PrismaService) {}

  async resolve(codigo: string, organizacionId: string, contexto: ScanContexto = 'AMBOS') {
    const codigoNorm = codigo.trim().toUpperCase()

    if (contexto !== 'CORRAL') {
      // 1. Buscar por arete SINIIGA
      const porSiniiga = await this.prisma.animal.findFirst({
        where: { organizacionId, areteSiniiga: codigoNorm },
        include: this.animalInclude(),
      })
      if (porSiniiga) {
        return { tipo: 'ANIMAL' as const, animal: await this.buildAnimalResult(porSiniiga) }
      }

      // 2. Buscar por arete blanco activo
      const asignacion = await this.prisma.asignacionAreteBlanco.findFirst({
        where: {
          areteBlanco: { organizacionId, codigo: codigoNorm },
          fechaLiberacion: null,
        },
        include: {
          animal: { include: this.animalInclude() },
        },
      })
      if (asignacion?.animal) {
        return { tipo: 'ANIMAL' as const, animal: await this.buildAnimalResult(asignacion.animal) }
      }
    }

    if (contexto !== 'ANIMAL') {
      // 3. Buscar corral por código
      const corral = await this.prisma.corral.findFirst({
        where: { codigo: codigoNorm, grupoCorrales: { organizacionId }, activo: true },
        include: {
          grupoCorrales: {
            select: {
              id: true, nombre: true,
              farmacia: { select: { id: true, nombre: true } },
            },
          },
          _count: { select: { animales: { where: { estado: 'ACTIVO' } } } },
        },
      })
      if (corral) {
        const [racionActiva, ultimaLectura] = await Promise.all([
          this.prisma.racionDefinicion.findFirst({
            where: { corralId: corral.id, activa: true },
            select: { id: true, cantidadKgManana: true, cantidadKgTarde: true, descripcion: true },
          }),
          this.prisma.lecturaComedor.findFirst({
            where: { corralId: corral.id },
            orderBy: { fechaLectura: 'desc' },
            select: {
              id: true, fechaLectura: true, notas: true,
              estadoConfig: { select: { id: true, nombre: true, color: true } },
            },
          }),
        ])
        return {
          tipo: 'CORRAL' as const,
          corral: {
            id: corral.id,
            nombre: corral.nombre,
            codigo: corral.codigo,
            grupoCorrales: corral.grupoCorrales,
            animalesCount: corral._count.animales,
            racionActiva,
            ultimaLectura,
          },
        }
      }
    }

    return { tipo: 'NO_ENCONTRADO' as const, codigo: codigoNorm }
  }

  private animalInclude() {
    return {
      corral: {
        select: {
          id: true, nombre: true, codigo: true,
          grupoCorrales: { select: { id: true, nombre: true, farmaciaId: true } },
        },
      },
      asignacionesArete: {
        where: { fechaLiberacion: null },
        take: 1,
        include: { areteBlanco: { select: { id: true, codigo: true } } },
      },
    } as const
  }

  private async buildAnimalResult(animal: {
    id: string
    areteSiniiga: string | null
    sexo: string
    pesoEntrada: { toNumber(): number }
    fechaEntrada: Date
    estado: string
    corral: {
      id: string; nombre: string; codigo: string
      grupoCorrales: { id: string; nombre: string; farmaciaId: string }
    }
    asignacionesArete: { areteBlanco: { id: string; codigo: string } }[]
  }) {
    const costoResult = await this.prisma.aplicacionTratamiento.aggregate({
      where: { animalId: animal.id },
      _sum: { costoTotalCalculado: true },
    })
    const tratamientosCount = await this.prisma.aplicacionTratamiento.count({
      where: { animalId: animal.id },
    })

    return {
      id: animal.id,
      areteSiniiga: animal.areteSiniiga,
      areteBlancoActual: animal.asignacionesArete[0]?.areteBlanco ?? null,
      sexo: animal.sexo,
      pesoEntrada: animal.pesoEntrada.toNumber(),
      fechaEntrada: animal.fechaEntrada,
      estado: animal.estado,
      corral: animal.corral,
      costoAcumulado: Number(costoResult._sum.costoTotalCalculado ?? 0),
      tratamientosCount,
    }
  }
}
