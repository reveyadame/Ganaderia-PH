import { IsString, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLecturaDto {
  @ApiProperty()
  @IsString()
  corralId!: string

  @ApiProperty({ description: 'ID del EstadoComederoConfig activo' })
  @IsString()
  estadoConfigId!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string
}
