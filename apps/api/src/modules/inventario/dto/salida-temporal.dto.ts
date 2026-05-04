import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SalidaTemporalDto {
  @ApiProperty({ description: 'ID del medicamento del que se entregan unidades' })
  @IsString()
  medicamentoId!: string

  @ApiProperty({ example: 1, description: 'Cantidad de unidades a entregar (FIFO: se toman las más antiguas)' })
  @IsInt()
  @Min(1)
  @Max(500)
  cantidad!: number

  @ApiProperty({ description: 'ID del médico/veterinario que recibe las unidades' })
  @IsString()
  medicoId!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string
}
