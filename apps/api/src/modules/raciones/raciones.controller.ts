import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { RacionesService } from './raciones.service'
import { CreateRacionDto } from './dto/create-racion.dto'
import { CreateSurtidoDto } from './dto/create-surtido.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Raciones')
@ApiBearerAuth()
@Controller('raciones')
export class RacionesController {
  constructor(private readonly service: RacionesService) {}

  @Get('activas')
  @ApiOperation({ summary: 'Raciones activas (todas) filtradas por grupos del usuario' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.RACIONES, ActividadUsuario.REPORTES)
  listarActivas(@CurrentUser() user: UsuarioSesion) {
    const filtro = user.tipo === TipoUsuario.SUPERUSUARIO ? undefined : user.gruposCorralesIds
    return this.service.listarActivas(user.organizacionId, filtro)
  }

  @Get('historial')
  @ApiOperation({ summary: 'Historial de raciones definidas' })
  @ApiQuery({ name: 'limit', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.RACIONES, ActividadUsuario.REPORTES)
  listarHistorial(@Query('limit') limit: string | undefined, @CurrentUser() user: UsuarioSesion) {
    const filtro = user.tipo === TipoUsuario.SUPERUSUARIO ? undefined : user.gruposCorralesIds
    const parsed = limit ? Math.min(Math.max(parseInt(limit), 1), 500) : 100
    return this.service.listarHistorial(user.organizacionId, filtro, parsed)
  }

  @Patch(':id/cantidades')
  @ApiOperation({ summary: 'Ajustar cantidades de una ración activa (sin cambiar nombre)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.COMEDEROS, ActividadUsuario.RACIONES)
  actualizarCantidades(
    @Param('id') id: string,
    @Body() body: { cantidadKgManana: number; cantidadKgTarde: number },
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.actualizarCantidades(id, body.cantidadKgManana, body.cantidadKgTarde, user.organizacionId)
  }

  @Get('activa')
  @ApiOperation({ summary: 'Ración activa de un corral' })
  @ApiQuery({ name: 'corralId', required: true })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.RACIONES, ActividadUsuario.REPORTES)
  getRacionActiva(@Query('corralId') corralId: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.getRacionActiva(corralId, user.organizacionId)
  }

  @Get('corral/:corralId')
  @ApiOperation({ summary: 'Historial de raciones de un corral' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.RACIONES, ActividadUsuario.REPORTES)
  getRacionesCorral(@Param('corralId') corralId: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.getRacionesCorral(corralId, user.organizacionId)
  }

  @Post('definir')
  @ApiOperation({ summary: 'Definir nueva ración para un corral (cierra la anterior)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.RACIONES)
  crearRacion(@Body() dto: CreateRacionDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.crearRacion(dto, user.id, user.organizacionId)
  }

  @Get('surtidos')
  @ApiOperation({ summary: 'Surtidos recientes de un corral' })
  @ApiQuery({ name: 'corralId', required: true })
  @ApiQuery({ name: 'limite', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.RACIONES, ActividadUsuario.REPORTES)
  getSurtidosRecientes(
    @Query('corralId') corralId: string,
    @Query('limite') limite: string,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.getSurtidosRecientes(corralId, user.organizacionId, limite ? parseInt(limite) : 10)
  }

  @Post('surtir')
  @ApiOperation({ summary: 'Registrar surtido real de ración' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.RACIONES)
  registrarSurtido(@Body() dto: CreateSurtidoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.registrarSurtido(dto, user.id, user.organizacionId)
  }
}
