import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { EstadoRegreso } from '@ganaderia/shared'

export class RegresoUnidadDto {
  @ApiProperty({ enum: EstadoRegreso, description: 'REGRESO_VACIO → CONSUMIDO | REGRESO_CON_CONTENIDO → DISPONIBLE' })
  @IsEnum(EstadoRegreso)
  estadoRegreso!: EstadoRegreso

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string
}
