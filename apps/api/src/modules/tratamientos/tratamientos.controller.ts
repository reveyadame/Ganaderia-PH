import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { TratamientosService } from './tratamientos.service'
import { CreateTratamientoDto } from './dto/create-tratamiento.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Tratamientos')
@ApiBearerAuth()
@Controller('tratamientos')
export class TratamientosController {
  constructor(private readonly service: TratamientosService) {}

  @Get()
  @ApiOperation({ summary: 'Historial de tratamientos de un animal' })
  @ApiQuery({ name: 'animalId', required: true })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.TRATAMIENTOS, ActividadUsuario.REPORTES)
  findByAnimal(@Query('animalId') animalId: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findByAnimal(animalId, user.organizacionId)
  }

  @Get('recientes')
  @ApiOperation({ summary: 'Tratamientos recientes de los grupos del usuario' })
  @ApiQuery({ name: 'limit', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.TRATAMIENTOS, ActividadUsuario.REPORTES)
  listarRecientes(@Query('limit') limit: string | undefined, @CurrentUser() user: UsuarioSesion) {
    const parsed = limit ? Math.min(Math.max(parseInt(limit), 1), 200) : 50
    return this.service.listarRecientes(user.organizacionId, user.gruposCorralesIds, parsed)
  }

  @Post('preview-costo')
  @ApiOperation({ summary: 'Vista previa del costo estimado antes de confirmar' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.TRATAMIENTOS)
  previewCosto(@Body() dto: CreateTratamientoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.previewCosto(dto, user.organizacionId)
  }

  @Post()
  @ApiOperation({ summary: 'Registrar aplicación de tratamiento' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.TRATAMIENTOS)
  create(@Body() dto: CreateTratamientoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.id, user.organizacionId)
  }
}
