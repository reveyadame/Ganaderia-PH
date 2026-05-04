import { IsString, IsNumber, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AltaUnidadDto {
  @ApiProperty()
  @IsString()
  medicamentoId!: string

  @ApiProperty({ example: 250.0, description: 'Costo de adquisición por frasco/pieza' })
  @IsNumber()
  @Min(0.01)
  costoUnitario!: number

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Cantidad de unidades a dar de alta con el mismo costo' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  cantidad?: number

  @ApiPropertyOptional({ example: 'Lote 2026-A, proveedor XYZ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notasProveedor?: string
}
