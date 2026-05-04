import { IsString, IsInt, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAjusteInventarioDto {
  @ApiProperty({ description: 'ID del medicamento al que se le ajustará el stock' })
  @IsString()
  medicamentoId!: string

  @ApiProperty({ example: 12, description: 'Cantidad real en almacén tras el ajuste (puede ser mayor o menor a la actual)' })
  @IsInt()
  @Min(0)
  @Max(10000)
  cantidadNueva!: number

  @ApiPropertyOptional({
    example: 250.0,
    description: 'Costo unitario para las unidades nuevas (requerido si cantidadNueva > stock actual)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number

  @ApiProperty({ example: 'Conteo físico mensual: se encontraron 3 frascos extra' })
  @IsString()
  @MaxLength(500)
  justificacion!: string
}
