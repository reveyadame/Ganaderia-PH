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
@RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
@Controller('farmacias')
export class FarmaciasController {
  constructor(private readonly service: FarmaciasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar farmacias' })
  findAll(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(user.organizacionId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener farmacia por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user.organizacionId)
  }

  @Post()
  @ApiOperation({ summary: 'Crear farmacia' })
  create(@Body() dto: CreateFarmaciaDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar farmacia' })
  update(@Param('id') id: string, @Body() dto: UpdateFarmaciaDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar farmacia' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
