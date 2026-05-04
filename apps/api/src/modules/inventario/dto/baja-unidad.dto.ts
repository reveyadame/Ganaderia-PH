import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TipoBajaMedicamento } from '@ganaderia/shared'

export class BajaUnidadDto {
  @ApiProperty({ description: 'ID de la UnidadMedicamento a dar de baja (debe estar DISPONIBLE o PRE_INGRESO)' })
  @IsString()
  unidadMedicamentoId!: string

  @ApiProperty({ enum: TipoBajaMedicamento })
  @IsEnum(TipoBajaMedicamento)
  tipo!: TipoBajaMedicamento

  @ApiPropertyOptional({ description: 'Obligatorio para AJUSTE, PERDIDA, ROBO, DANO' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificacion?: string
}
