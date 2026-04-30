import { IsString, IsEnum, IsOptional, IsNumber, IsPositive, IsDateString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SexoAnimal } from '@ganaderia/shared'

export class CreateAnimalDto {
  @ApiPropertyOptional({ example: 'MX001234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  areteSiniiga?: string

  @ApiPropertyOptional({ example: 'A-042', description: 'Código del arete blanco a asignar' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  areteBlancoId?: string

  @ApiProperty({ enum: SexoAnimal })
  @IsEnum(SexoAnimal)
  sexo!: SexoAnimal

  @ApiProperty({ example: 245.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  pesoEntrada!: number

  @ApiProperty({ example: '2026-04-29' })
  @IsDateString()
  fechaEntrada!: string

  @ApiProperty({ example: 'corral-id' })
  @IsString()
  corralId!: string

  @ApiPropertyOptional({ example: 'lote-id' })
  @IsOptional()
  @IsString()
  loteId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string
}
