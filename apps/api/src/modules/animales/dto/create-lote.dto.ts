import { IsString, IsOptional, IsInt, IsPositive, IsDateString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLoteDto {
  @ApiProperty({ example: 'L-2026-001' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  codigo!: string

  @ApiProperty({ example: 'corral-id' })
  @IsString()
  corralId!: string

  @ApiPropertyOptional({ example: 'Rancho La Esperanza, Jalisco' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  procedencia?: string

  @ApiPropertyOptional({ example: '2026-04-29' })
  @IsOptional()
  @IsDateString()
  fechaEntrada?: string

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  numAnimalesEsperados?: number
}
