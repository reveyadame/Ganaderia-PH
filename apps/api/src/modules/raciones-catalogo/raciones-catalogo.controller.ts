import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { RacionesCatalogoService } from './raciones-catalogo.service'
import { CreateRacionCatalogoDto } from './dto/create-racion-catalogo.dto'
import { UpdateRacionCatalogoDto } from './dto/update-racion-catalogo.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Catálogo de Raciones')
@ApiBearerAuth()
@Controller('raciones-catalogo')
export class RacionesCatalogoController {
  constructor(private readonly service: RacionesCatalogoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de raciones (todos los roles autenticados)' })
  findAll(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(user.organizacionId)
  }

  @Post()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.RACIONES)
  @ApiOperation({ summary: 'Crear ración en el catálogo' })
  create(@Body() dto: CreateRacionCatalogoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.RACIONES)
  @ApiOperation({ summary: 'Actualizar ración del catálogo' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRacionCatalogoDto,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Delete(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.RACIONES)
  @ApiOperation({ summary: 'Desactivar ración del catálogo' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
