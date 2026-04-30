import { IsEnum, IsOptional, IsNumber, IsPositive, IsDateString, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CausaEgresoAnimal } from '@ganaderia/shared'

export class EgresoAnimalDto {
  @ApiProperty({ enum: CausaEgresoAnimal })
  @IsEnum(CausaEgresoAnimal)
  causa!: CausaEgresoAnimal

  @ApiProperty({ example: '2026-04-29' })
  @IsDateString()
  fechaEgreso!: string

  @ApiPropertyOptional({ example: 18500.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precioVenta?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string
}
