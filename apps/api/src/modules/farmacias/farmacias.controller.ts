import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FarmaciasService } from './farmacias.service'
import { CreateFarmaciaDto } from './dto/create-farmacia.dto'
import { UpdateFarmaciaDto } from './dto/update-farmacia.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Farmacias')
@ApiBearerAuth()
@RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
@Controller('farmacias')
export class FarmaciasController {
  constructor(private readonly service: FarmaciasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar farmacias accesibles para el usuario' })
  findAll(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener farmacia por ID (solo si el usuario tiene acceso)' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user)
  }

  @Post()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO)
  @ApiOperation({ summary: 'Crear farmacia (solo SUPERUSUARIO)' })
  create(@Body() dto: CreateFarmaciaDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar farmacia' })
  update(@Param('id') id: string, @Body() dto: UpdateFarmaciaDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user)
  }

  @Delete(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO)
  @ApiOperation({ summary: 'Desactivar farmacia (solo SUPERUSUARIO)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user)
  }
}
