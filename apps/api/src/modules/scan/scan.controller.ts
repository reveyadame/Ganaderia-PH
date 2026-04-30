import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsOptional, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ScanService } from './scan.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UsuarioSesion } from '@ganaderia/shared'

class ScanResolveDto {
  @ApiProperty({ example: 'MX001234567890' })
  @IsString()
  codigo!: string

  @ApiPropertyOptional({ enum: ['ANIMAL', 'CORRAL', 'AMBOS'], default: 'AMBOS' })
  @IsOptional()
  @IsEnum(['ANIMAL', 'CORRAL', 'AMBOS'])
  contexto?: 'ANIMAL' | 'CORRAL' | 'AMBOS'
}

@ApiTags('Scanner')
@ApiBearerAuth()
@Controller('scan')
export class ScanController {
  constructor(private readonly service: ScanService) {}

  @Post('resolve')
  @ApiOperation({
    summary: 'Resolver código escaneado',
    description: 'Recibe cualquier código (arete SINIIGA, arete blanco o código de corral) y devuelve la entidad correspondiente',
  })
  resolve(@Body() dto: ScanResolveDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.resolve(dto.codigo, user.organizacionId, dto.contexto)
  }
}
