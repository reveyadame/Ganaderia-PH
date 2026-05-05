import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AnimalesService } from './animales.service'
import { CreateAnimalDto } from './dto/create-animal.dto'
import { EgresoAnimalDto } from './dto/egreso-animal.dto'
import { CreateLoteDto } from './dto/create-lote.dto'
import { QueryAnimalesDto } from './dto/query-animales.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, ActividadUsuario, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Animales')
@ApiBearerAuth()
@Controller('animales')
export class AnimalesController {
  constructor(private readonly service: AnimalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar animales con filtros y paginación' })
  findAll(@CurrentUser() user: UsuarioSesion, @Query() query: QueryAnimalesDto) {
    return this.service.findAll(user, query)
  }

  @Get('lotes')
  @ApiOperation({ summary: 'Listar lotes' })
  findAllLotes(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAllLotes(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ficha de animal' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user)
  }

  @Post()
  @RequiereActividad(ActividadUsuario.REGISTRO)
  @ApiOperation({ summary: 'Registrar llegada de animal' })
  create(@Body() dto: CreateAnimalDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user)
  }

  @Patch(':id/egreso')
  @RequiereActividad(ActividadUsuario.REGISTRO)
  @ApiOperation({ summary: 'Registrar egreso de animal (venta, muerte, baja)' })
  egreso(@Param('id') id: string, @Body() dto: EgresoAnimalDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.egreso(id, dto, user)
  }

  @Patch(':id/liberar-arete')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Liberar arete blanco (admin)' })
  liberarArete(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.liberarAreteBlanco(id, user)
  }

  @Post('lotes')
  @RequiereActividad(ActividadUsuario.REGISTRO)
  @ApiOperation({ summary: 'Crear lote de llegada' })
  createLote(@Body() dto: CreateLoteDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.createLote(dto, user)
  }
}
