import { IsString, IsOptional, IsNumber, Min, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRacionDto {
  @ApiProperty()
  @IsString()
  corralId!: string

  @ApiPropertyOptional({ description: 'ID del catálogo de raciones (toma el nombre de ahí)' })
  @IsOptional()
  @IsString()
  catalogoId?: string

  @ApiPropertyOptional({ example: 'Engorda fase 2', description: 'Solo si no se usa catalogoId' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre?: string

  @ApiProperty({ example: 25.5, description: 'Kg a suministrar en turno mañana' })
  @IsNumber()
  @Min(0)
  cantidadKgManana!: number

  @ApiProperty({ example: 25.5, description: 'Kg a suministrar en turno tarde' })
  @IsNumber()
  @Min(0)
  cantidadKgTarde!: number

  @ApiPropertyOptional({ example: 'Aumento por calor' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string
}
