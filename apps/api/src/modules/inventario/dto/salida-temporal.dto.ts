import { IsString, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SalidaTemporalDto {
  @ApiProperty({ description: 'ID de la UnidadMedicamento que sale (debe estar DISPONIBLE)' })
  @IsString()
  unidadMedicamentoId!: string

  @ApiProperty({ description: 'ID del médico/veterinario que recibe la unidad' })
  @IsString()
  medicoId!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string
}
