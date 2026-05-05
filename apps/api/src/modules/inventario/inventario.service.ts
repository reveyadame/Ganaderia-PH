import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { Prisma } from '@ganaderia/database'
import { PrismaService } from '../../prisma/prisma.service'
import { AltaUnidadDto } from './dto/alta-unidad.dto'
import { SalidaTemporalDto } from './dto/salida-temporal.dto'
import { RegresoUnidadDto } from './dto/regreso-unidad.dto'
import { BajaUnidadDto } from './dto/baja-unidad.dto'
import { CreateAjusteInventarioDto } from './dto/ajuste-inventario.dto'
import { EstadoRegreso, TipoBajaMedicamento, UsuarioSesion } from '@ganaderia/shared'
import { assertFarmaciaAccess } from '../../common/utils/farmacia-access.util'

const REQUIEREN_JUSTIFICACION: TipoBajaMedicamento[] = [
  TipoBajaMedicamento.AJUSTE,
  TipoBajaMedicamento.PERDIDA,
  TipoBajaMedicamento.ROBO,
  TipoBajaMedicamento.DANO,
]

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resuelve un medicamento del catálogo de la organización del usuario.
   * Usado por todos los endpoints que reciben `medicamentoId` en el body.
   */
  private async getMedicamentoOrFail(medicamentoId: string, user: UsuarioSesion) {
    const med = await this.prisma.medicamento.findFirst({
      where: { id: medicamentoId, organizacionId: user.organizacionId, activo: true },
    })
    if (!med) throw new NotFoundException('Medicamento no encontrado')
    return med
  }

  // ── Stock summary ──────────────────────────────────────────────────────────

  async getStock(farmaciaId: string, user: UsuarioSesion) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

    const medicamentos = await this.prisma.medicamento.findMany({
      where: { organizacionId: user.organizacionId, activo: true },
      orderBy: { nombre: 'asc' },
    })

    const stockRows = await this.prisma.unidadMedicamento.groupBy({
      by: ['medicamentoId', 'estado'],
      where: { farmaciaId },
      _count: { id: true },
    })

    const resultado = medicamentos.map(med => {
      const rows = stockRows.filter(r => r.medicamentoId === med.id)
      const disponibles = rows.find(r => r.estado === 'DISPONIBLE')?._count.id ?? 0
      const salidas = rows.find(r => r.estado === 'SALIDA_TEMPORAL')?._count.id ?? 0
      const preIngreso = rows.find(r => r.estado === 'PRE_INGRESO')?._count.id ?? 0
      const stockOperativo = disponibles + salidas
      return {
        ...med,
        stock: { disponibles, salidas, preIngreso, stockOperativo },
        alerta: stockOperativo <= med.stockMinimo,
      }
    })

    const alertas = resultado.filter(r => r.alerta)
    return { medicamentos: resultado, totalAlertas: alertas.length }
  }

  // ── Unidades ───────────────────────────────────────────────────────────────

  async getUnidades(
    farmaciaId: string,
    user: UsuarioSesion,
    opts: { medicamentoId?: string; estado?: string; page?: number; limit?: number },
  ) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

    const page = opts.page ?? 1
    const limit = opts.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      farmaciaId,
      ...(opts.medicamentoId ? { medicamentoId: opts.medicamentoId } : {}),
      ...(opts.estado ? { estado: opts.estado as never } : {}),
    }

    const [unidades, total] = await Promise.all([
      this.prisma.unidadMedicamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaEntrada: 'desc' },
        include: {
          medicamento: { select: { nombre: true, presentacion: true, unidadMedida: true, volumenPresentacion: true } },
          ingresadoPor: { select: { nombre: true } },
          salidasTemporales: {
            where: { fechaRegreso: null },
            include: { medico: { select: { nombre: true } } },
          },
        },
      }),
      this.prisma.unidadMedicamento.count({ where }),
    ])

    return { data: unidades, total, page, totalPages: Math.ceil(total / limit) }
  }

  // ── Alta de unidad (cohorte por costo, bulk) ──────────────────────────────

  async altaUnidad(dto: AltaUnidadDto, user: UsuarioSesion) {
    const medicamento = await this.getMedicamentoOrFail(dto.medicamentoId, user)
    await assertFarmaciaAccess(this.prisma, user, dto.farmaciaId)

    const farmaciaId = dto.farmaciaId
    const cantidad = dto.cantidad ?? 1
    const costoUnitario = dto.costoUnitario
    const costoPorMedida = Number(costoUnitario) / Number(medicamento.volumenPresentacion)

    const dataBase = {
      medicamentoId: dto.medicamentoId,
      farmaciaId,
      costoUnitario,
      costoPorMedida,
      notasProveedor: dto.notasProveedor,
      ingresadoPorId: user.id,
    }

    return this.prisma.$transaction(async (tx) => {
      // BR-FA-002: si hay cualquier unidad activa, todas las nuevas van a PRE_INGRESO.
      const estado = await this.determinarEstadoNuevaUnidad(tx, dto.medicamentoId, farmaciaId)

      const creadas: Awaited<ReturnType<typeof tx.unidadMedicamento.create>>[] = []
      for (let i = 0; i < cantidad; i++) {
        const u = await tx.unidadMedicamento.create({ data: { ...dataBase, estado } })
        creadas.push(u)
      }

      // Si entraron como PRE_INGRESO y no hay cohorte activa, la cohorte más antigua
      // (otro batch en PI) debe promoverse para volverse activa.
      if (estado === 'PRE_INGRESO') {
        await this.promoverPreIngreso(tx, dto.medicamentoId, farmaciaId)
      }

      return {
        cantidad: creadas.length,
        unidades: creadas,
        medicamento: { id: medicamento.id, nombre: medicamento.nombre },
      }
    })
  }

  // ── Salidas temporales ─────────────────────────────────────────────────────

  async getSalidas(
    farmaciaId: string,
    user: UsuarioSesion,
    opts: { abierta?: boolean; page?: number; limit?: number },
  ) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

    const page = opts.page ?? 1
    const limit = opts.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      unidadMedicamento: { farmaciaId },
      ...(opts.abierta === true ? { fechaRegreso: null } : {}),
      ...(opts.abierta === false ? { NOT: { fechaRegreso: null } } : {}),
    }

    const [salidas, total] = await Promise.all([
      this.prisma.salidaTemporal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaSalida: 'desc' },
        include: {
          unidadMedicamento: {
            include: { medicamento: { select: { nombre: true, presentacion: true } } },
          },
          medico: { select: { nombre: true, email: true } },
          autorizadoPor: { select: { nombre: true } },
        },
      }),
      this.prisma.salidaTemporal.count({ where }),
    ])

    return { data: salidas, total, page, totalPages: Math.ceil(total / limit) }
  }

  async crearSalidaTemporal(dto: SalidaTemporalDto, user: UsuarioSesion) {
    const medicamento = await this.getMedicamentoOrFail(dto.medicamentoId, user)
    await assertFarmaciaAccess(this.prisma, user, dto.farmaciaId)

    const medico = await this.prisma.usuario.findFirst({ where: { id: dto.medicoId, organizacionId: user.organizacionId } })
    if (!medico) throw new NotFoundException('Médico no encontrado')

    // FIFO: tomar las N unidades más antiguas en DISPONIBLE o PRE_INGRESO de esta farmacia
    const candidatas = await this.prisma.unidadMedicamento.findMany({
      where: {
        medicamentoId: medicamento.id,
        farmaciaId: dto.farmaciaId,
        estado: { in: ['DISPONIBLE', 'PRE_INGRESO'] },
      },
      orderBy: { fechaEntrada: 'asc' },
      take: dto.cantidad,
    })

    if (candidatas.length < dto.cantidad) {
      throw new BadRequestException(
        `Stock insuficiente: solicitadas ${dto.cantidad}, disponibles ${candidatas.length}`,
      )
    }

    return this.prisma.$transaction(async (tx) => {
      const salidas: Awaited<ReturnType<typeof tx.salidaTemporal.create>>[] = []
      for (const unidad of candidatas) {
        const salida = await tx.salidaTemporal.create({
          data: {
            unidadMedicamentoId: unidad.id,
            medicoId: dto.medicoId,
            autorizadoPorId: user.id,
            notas: dto.notas,
          },
        })
        await tx.unidadMedicamento.update({
          where: { id: unidad.id },
          data: { estado: 'SALIDA_TEMPORAL', fechaEstadoCambio: new Date() },
        })
        salidas.push(salida)
      }
      return {
        cantidad: salidas.length,
        salidas,
        medicamento: { id: medicamento.id, nombre: medicamento.nombre },
      }
    })
  }

  async registrarRegreso(salidaId: string, dto: RegresoUnidadDto, user: UsuarioSesion) {
    const salida = await this.prisma.salidaTemporal.findFirst({
      where: { id: salidaId },
      include: { unidadMedicamento: { include: { medicamento: true } } },
    })
    if (!salida) throw new NotFoundException('Salida no encontrada')
    if (salida.unidadMedicamento.medicamento.organizacionId !== user.organizacionId) {
      throw new NotFoundException('Salida no encontrada')
    }
    await assertFarmaciaAccess(this.prisma, user, salida.unidadMedicamento.farmaciaId)
    if (salida.fechaRegreso) throw new BadRequestException('Esta salida ya tiene regreso registrado')
    if (salida.unidadMedicamento.estado !== 'SALIDA_TEMPORAL') {
      throw new BadRequestException('La unidad no está en salida temporal')
    }

    const nuevoEstado =
      dto.estadoRegreso === EstadoRegreso.REGRESO_VACIO ? 'CONSUMIDO' : 'DISPONIBLE'

    return this.prisma.$transaction(async tx => {
      await tx.salidaTemporal.update({
        where: { id: salidaId },
        data: { fechaRegreso: new Date(), estadoRegreso: dto.estadoRegreso, notas: dto.notas ?? salida.notas },
      })
      await tx.unidadMedicamento.update({
        where: { id: salida.unidadMedicamentoId },
        data: { estado: nuevoEstado, fechaEstadoCambio: new Date() },
      })

      // Si el frasco regresó consumido → verificar si hay PRE_INGRESO que promover (BR-FA-003)
      if (nuevoEstado === 'CONSUMIDO') {
        await this.promoverPreIngreso(
          tx,
          salida.unidadMedicamento.medicamentoId,
          salida.unidadMedicamento.farmaciaId,
        )
      }

      return tx.salidaTemporal.findUnique({
        where: { id: salidaId },
        include: {
          unidadMedicamento: { include: { medicamento: { select: { nombre: true } } } },
        },
      })
    })
  }

  // ── Baja individual de una unidad ──────────────────────────────────────────

  async registrarBaja(dto: BajaUnidadDto, user: UsuarioSesion) {
    if (REQUIEREN_JUSTIFICACION.includes(dto.tipo) && !dto.justificacion?.trim()) {
      throw new BadRequestException(`El tipo ${dto.tipo} requiere justificación`)
    }

    const unidad = await this.prisma.unidadMedicamento.findFirst({
      where: { id: dto.unidadMedicamentoId },
      include: { medicamento: true },
    })
    if (!unidad) throw new NotFoundException('Unidad no encontrada')
    if (unidad.medicamento.organizacionId !== user.organizacionId) {
      throw new NotFoundException('Unidad no encontrada')
    }
    await assertFarmaciaAccess(this.prisma, user, unidad.farmaciaId)
    if (!['DISPONIBLE', 'PRE_INGRESO'].includes(unidad.estado)) {
      throw new BadRequestException(`La unidad no puede darse de baja (estado: ${unidad.estado})`)
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.bajaMedicamento.create({
        data: {
          unidadMedicamentoId: unidad.id,
          tipo: dto.tipo,
          justificacion: dto.justificacion,
          registradoPorId: user.id,
        },
      })
      await tx.unidadMedicamento.update({
        where: { id: unidad.id },
        data: { estado: 'BAJA', fechaEstadoCambio: new Date() },
      })

      if (unidad.estado === 'DISPONIBLE') {
        await this.promoverPreIngreso(tx, unidad.medicamentoId, unidad.farmaciaId)
      }

      return tx.unidadMedicamento.findUnique({
        where: { id: unidad.id },
        include: { medicamento: { select: { nombre: true } }, baja: true },
      })
    })
  }

  // ── Ajuste de inventario (SUPERUSUARIO) ────────────────────────────────────

  async crearAjuste(dto: CreateAjusteInventarioDto, user: UsuarioSesion) {
    const medicamento = await this.getMedicamentoOrFail(dto.medicamentoId, user)
    await assertFarmaciaAccess(this.prisma, user, dto.farmaciaId)

    const stockOperativo = await this.prisma.unidadMedicamento.count({
      where: {
        medicamentoId: medicamento.id,
        farmaciaId: dto.farmaciaId,
        estado: { in: ['DISPONIBLE', 'PRE_INGRESO', 'SALIDA_TEMPORAL'] },
      },
    })

    const cantidadAnterior = stockOperativo
    const cantidadNueva = dto.cantidadNueva
    const delta = cantidadNueva - cantidadAnterior

    if (delta === 0) {
      throw new BadRequestException('La cantidad nueva es igual al stock actual; no hay ajuste a realizar')
    }
    if (delta > 0 && (dto.costoUnitario === undefined || dto.costoUnitario === null)) {
      throw new BadRequestException('costoUnitario es requerido cuando cantidadNueva > stock actual')
    }
    if (delta < 0) {
      // Solo podemos bajar unidades en DISPONIBLE o PRE_INGRESO (no SALIDA_TEMPORAL)
      const bajables = await this.prisma.unidadMedicamento.count({
        where: {
          medicamentoId: medicamento.id,
          farmaciaId: dto.farmaciaId,
          estado: { in: ['DISPONIBLE', 'PRE_INGRESO'] },
        },
      })
      if (Math.abs(delta) > bajables) {
        throw new BadRequestException(
          `No se pueden quitar ${Math.abs(delta)} unidades: solo ${bajables} están en stock no salido (las demás están en SALIDA_TEMPORAL)`,
        )
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const ajuste = await tx.ajusteInventario.create({
        data: {
          medicamentoId: medicamento.id,
          farmaciaId: dto.farmaciaId,
          cantidadAnterior,
          cantidadNueva,
          delta,
          costoUnitario: delta > 0 ? dto.costoUnitario : null,
          justificacion: dto.justificacion,
          realizadoPorId: user.id,
        },
        include: {
          medicamento: { select: { nombre: true, presentacion: true, unidadMedida: true, volumenPresentacion: true } },
          realizadoPor: { select: { nombre: true, apellido: true } },
        },
      })

      if (delta > 0) {
        // Crear N unidades nuevas como un solo batch (mismo costo) — BR-FA-002.
        const costoUnitario = dto.costoUnitario!
        const costoPorMedida = Number(costoUnitario) / Number(medicamento.volumenPresentacion)
        const estado = await this.determinarEstadoNuevaUnidad(tx, medicamento.id, dto.farmaciaId)
        for (let i = 0; i < delta; i++) {
          await tx.unidadMedicamento.create({
            data: {
              medicamentoId: medicamento.id,
              farmaciaId: dto.farmaciaId,
              costoUnitario,
              costoPorMedida,
              estado,
              ingresadoPorId: user.id,
              notasProveedor: `Ajuste de inventario #${ajuste.id.slice(-6)}: ${dto.justificacion}`,
            },
          })
        }
        if (estado === 'PRE_INGRESO') {
          await this.promoverPreIngreso(tx, medicamento.id, dto.farmaciaId)
        }
      } else {
        // Bajas newest-first
        const candidatas = await tx.unidadMedicamento.findMany({
          where: {
            medicamentoId: medicamento.id,
            farmaciaId: dto.farmaciaId,
            estado: { in: ['DISPONIBLE', 'PRE_INGRESO'] },
          },
          orderBy: { fechaEntrada: 'desc' },
          take: Math.abs(delta),
        })
        let huboDisponible = false
        for (const u of candidatas) {
          await tx.bajaMedicamento.create({
            data: {
              unidadMedicamentoId: u.id,
              tipo: TipoBajaMedicamento.AJUSTE,
              justificacion: `Ajuste #${ajuste.id.slice(-6)}: ${dto.justificacion}`,
              registradoPorId: user.id,
            },
          })
          await tx.unidadMedicamento.update({
            where: { id: u.id },
            data: { estado: 'BAJA', fechaEstadoCambio: new Date() },
          })
          if (u.estado === 'DISPONIBLE') huboDisponible = true
        }
        if (huboDisponible) {
          await this.promoverPreIngreso(tx, medicamento.id, dto.farmaciaId)
        }
      }

      return ajuste
    })
  }

  async getAjustes(
    farmaciaId: string,
    user: UsuarioSesion,
    opts: { medicamentoId?: string; page?: number; limit?: number },
  ) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

    const page = opts.page ?? 1
    const limit = opts.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      farmaciaId,
      ...(opts.medicamentoId ? { medicamentoId: opts.medicamentoId } : {}),
    }

    const [ajustes, total] = await Promise.all([
      this.prisma.ajusteInventario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaAjuste: 'desc' },
        include: {
          medicamento: { select: { nombre: true, presentacion: true, unidadMedida: true } },
          realizadoPor: { select: { nombre: true, apellido: true } },
        },
      }),
      this.prisma.ajusteInventario.count({ where }),
    ])

    return { data: ajustes, total, page, totalPages: Math.ceil(total / limit) }
  }

  // ── Privados ───────────────────────────────────────────────────────────────

  /**
   * BR-FA-002: si existe cualquier unidad activa (DISPONIBLE, SALIDA_TEMPORAL o
   * PRE_INGRESO), las nuevas entran como PRE_INGRESO para preservar FIFO.
   * Solo van a DISPONIBLE cuando no hay absolutamente ninguna unidad previa.
   */
  private async determinarEstadoNuevaUnidad(
    tx: Prisma.TransactionClient,
    medicamentoId: string,
    farmaciaId: string,
  ): Promise<'DISPONIBLE' | 'PRE_INGRESO'> {
    const hayAlguna = await tx.unidadMedicamento.count({
      where: { medicamentoId, farmaciaId, estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL', 'PRE_INGRESO'] } },
    })
    return hayAlguna > 0 ? 'PRE_INGRESO' : 'DISPONIBLE'
  }

  /**
   * Promueve manualmente todas las unidades PRE_INGRESO de un precio dado
   * a DISPONIBLE. Requiere que no haya cohorte activa con distinto precio.
   */
  async promoverPreIngresoManual(
    medicamentoId: string,
    farmaciaId: string,
    costoPorMedida: number,
    user: UsuarioSesion,
  ) {
    const medicamento = await this.getMedicamentoOrFail(medicamentoId, user)
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

    return this.prisma.$transaction(async tx => {
      const cohortActiva = await tx.unidadMedicamento.findFirst({
        where: { medicamentoId, farmaciaId, estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] } },
        select: { costoPorMedida: true },
      })

      if (cohortActiva) {
        const costoActual = Number(cohortActiva.costoPorMedida)
        if (Math.abs(costoActual - costoPorMedida) > 0.0001) {
          throw new ConflictException(
            `Hay una cohorte activa con precio diferente (${costoActual.toFixed(4)}); espera a que se agote antes de promover este batch`,
          )
        }
      }

      const result = await tx.unidadMedicamento.updateMany({
        where: { medicamentoId, farmaciaId, estado: 'PRE_INGRESO', costoPorMedida },
        data: { estado: 'DISPONIBLE', fechaEstadoCambio: new Date() },
      })

      if (result.count === 0) {
        throw new NotFoundException('No hay unidades PRE_INGRESO con ese precio para promover')
      }

      return { promovidas: result.count, medicamento: { id: medicamento.id, nombre: medicamento.nombre } }
    })
  }

  /**
   * BR-FA-003: cuando no queda cohorte activa (DISPONIBLE = 0 y SALIDA_TEMPORAL = 0),
   * promueve TODO el batch PRE_INGRESO más antiguo (todas las unidades que comparten
   * el costoPorMedida de la unidad PI más antigua) a DISPONIBLE de una sola vez.
   */
  private async promoverPreIngreso(
    tx: Prisma.TransactionClient,
    medicamentoId: string,
    farmaciaId: string,
  ) {
    const hayActivos = await tx.unidadMedicamento.count({
      where: { medicamentoId, farmaciaId, estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] } },
    })
    if (hayActivos > 0) return

    const candidato = await tx.unidadMedicamento.findFirst({
      where: { medicamentoId, farmaciaId, estado: 'PRE_INGRESO' },
      orderBy: { fechaEntrada: 'asc' },
      select: { costoPorMedida: true },
    })
    if (!candidato) return

    await tx.unidadMedicamento.updateMany({
      where: {
        medicamentoId,
        farmaciaId,
        estado: 'PRE_INGRESO',
        costoPorMedida: candidato.costoPorMedida,
      },
      data: { estado: 'DISPONIBLE', fechaEstadoCambio: new Date() },
    })
  }
}
