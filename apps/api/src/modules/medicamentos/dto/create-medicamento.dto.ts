import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, MaxLength, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PresentacionMedicamento, UnidadMedida } from '@ganaderia/shared'

export class CreateMedicamentoDto {
  @ApiProperty()
  @IsString()
  farmaciaId!: string

  @ApiProperty({ example: 'Penicilina G Procaínica' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string

  @ApiPropertyOptional({ example: 'Bencilpenicilina procaínica' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombreGenerico?: string

  @ApiProperty({ enum: PresentacionMedicamento })
  @IsEnum(PresentacionMedicamento)
  presentacion!: PresentacionMedicamento

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.001)
  volumenPresentacion!: number

  @ApiProperty({ enum: UnidadMedida })
  @IsEnum(UnidadMedida)
  unidadMedida!: UnidadMedida

  @ApiProperty({ example: 3, description: 'Unidades mínimas antes de generar alerta' })
  @IsInt()
  @Min(0)
  stockMinimo!: number
}
