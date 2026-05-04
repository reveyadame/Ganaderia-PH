import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRacionCatalogoDto {
  @ApiProperty({ example: 'Engorda fase 2' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string

  @ApiPropertyOptional({ example: 'Mezcla rica en proteína para periodo de finalización' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string
}
