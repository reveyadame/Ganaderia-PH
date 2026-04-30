import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { AretesService } from './aretes.service'
import { CreateAreteBlancoDto, CreateAretesBlancosLoteDto } from './dto/create-arete-blanco.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Aretes Blancos')
@ApiBearerAuth()
@Controller('aretes')
export class AretesController {
  constructor(private readonly service: AretesService) {}

  @Get()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar pool de aretes blancos' })
  @ApiQuery({ name: 'estado', enum: ['DISPONIBLE', 'ASIGNADO'], required: false })
  findAll(
    @CurrentUser() user: UsuarioSesion,
    @Query('estado') estado?: 'DISPONIBLE' | 'ASIGNADO',
  ) {
    return this.service.findAll(user.organizacionId, estado)
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Aretes disponibles para asignar (todos los usuarios)' })
  getDisponibles(@CurrentUser() user: UsuarioSesion) {
    return this.service.getDisponibles(user.organizacionId)
  }

  @Post()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  @ApiOperation({ summary: 'Agregar un arete al pool' })
  create(@Body() dto: CreateAreteBlancoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Post('lote')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  @ApiOperation({ summary: 'Agregar múltiples aretes al pool (lote)' })
  createLote(@Body() dto: CreateAretesBlancosLoteDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.createLote(dto, user.organizacionId)
  }

  @Delete(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar arete disponible del pool' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
