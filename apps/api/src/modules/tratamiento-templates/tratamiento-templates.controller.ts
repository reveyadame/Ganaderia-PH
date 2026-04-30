import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TratamientoTemplatesService } from './tratamiento-templates.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Tratamiento Templates')
@ApiBearerAuth()
@Controller('tratamiento-templates')
export class TratamientoTemplatesController {
  constructor(private readonly service: TratamientoTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar kits de tratamiento' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.TRATAMIENTOS, ActividadUsuario.REPORTES)
  findAll(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(user.organizacionId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener kit por ID' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.TRATAMIENTOS, ActividadUsuario.REPORTES)
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user.organizacionId)
  }

  @Post()
  @ApiOperation({ summary: 'Crear kit de tratamiento' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId, user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar kit' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar kit (soft delete)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
