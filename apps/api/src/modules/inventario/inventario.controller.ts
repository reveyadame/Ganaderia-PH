import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { InventarioService } from './inventario.service'
import { AltaUnidadDto } from './dto/alta-unidad.dto'
import { SalidaTemporalDto } from './dto/salida-temporal.dto'
import { RegresoUnidadDto } from './dto/regreso-unidad.dto'
import { BajaUnidadDto } from './dto/baja-unidad.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Inventario')
@ApiBearerAuth()
@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Resumen de stock por medicamento con alertas' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getStock(@Query('farmaciaId') farmaciaId: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.getStock(farmaciaId, user.organizacionId)
  }

  @Get('unidades')
  @ApiOperation({ summary: 'Listar unidades de medicamento con filtros' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @ApiQuery({ name: 'medicamentoId', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getUnidades(
    @Query('farmaciaId') farmaciaId: string,
    @Query('medicamentoId') medicamentoId: string | undefined,
    @Query('estado') estado: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.getUnidades(farmaciaId, user.organizacionId, {
      medicamentoId,
      estado,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }

  @Post('alta')
  @ApiOperation({ summary: 'Dar de alta una nueva unidad (FIFO: PRE_INGRESO si hay DISPONIBLES)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  altaUnidad(@Body() dto: AltaUnidadDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.altaUnidad(dto, user.id, user.organizacionId)
  }

  @Get('salidas')
  @ApiOperation({ summary: 'Listar salidas temporales' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @ApiQuery({ name: 'abierta', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getSalidas(
    @Query('farmaciaId') farmaciaId: string,
    @Query('abierta') abierta: string | undefined,
    @Query('page') page: string | undefined,
    @CurrentUser() user: UsuarioSesion,
  ) {
    const abiertoFlag = abierta === 'true' ? true : abierta === 'false' ? false : undefined
    return this.service.getSalidas(farmaciaId, user.organizacionId, {
      abierta: abiertoFlag,
      page: page ? parseInt(page) : undefined,
    })
  }

  @Post('salidas')
  @ApiOperation({ summary: 'Registrar salida temporal a médico' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  crearSalida(@Body() dto: SalidaTemporalDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.crearSalidaTemporal(dto, user.id, user.organizacionId)
  }

  @Patch('salidas/:id/regreso')
  @ApiOperation({ summary: 'Registrar regreso de unidad (vacío → CONSUMIDO, con contenido → DISPONIBLE)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  registrarRegreso(
    @Param('id') id: string,
    @Body() dto: RegresoUnidadDto,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.registrarRegreso(id, dto, user.organizacionId)
  }

  @Post('bajas')
  @ApiOperation({ summary: 'Dar de baja una unidad (ajuste, pérdida, caducidad, etc.)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  registrarBaja(@Body() dto: BajaUnidadDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.registrarBaja(dto, user.id, user.organizacionId)
  }
}
