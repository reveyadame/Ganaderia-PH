import { IsString, IsOptional, IsInt, Min, MaxLength, MinLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateEstadoConfigDto {
  @ApiProperty({ example: 'Con comida' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number

  @ApiPropertyOptional({ example: '#22c55e', description: 'Color hex para UI' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color debe ser un hex válido (#RRGGBB)' })
  color?: string
}
