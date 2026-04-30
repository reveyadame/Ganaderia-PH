import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AltaUnidadDto {
  @ApiProperty()
  @IsString()
  medicamentoId!: string

  @ApiProperty({ example: 250.00, description: 'Costo de adquisición del frasco/pieza' })
  @IsNumber()
  @Min(0.01)
  costoUnitario!: number

  @ApiPropertyOptional({ example: 'Lote 2026-A, proveedor XYZ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notasProveedor?: string
}
