import { IsString, IsOptional, IsEnum, IsNumber, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TurnoRacion } from '@ganaderia/shared'

export class CreateSurtidoDto {
  @ApiProperty()
  @IsString()
  corralId!: string

  @ApiPropertyOptional({ description: 'ID de la RacionDefinicion activa (opcional, se resuelve automáticamente)' })
  @IsOptional()
  @IsString()
  racionDefinicionId?: string

  @ApiProperty({ enum: TurnoRacion })
  @IsEnum(TurnoRacion)
  turno!: TurnoRacion

  @ApiProperty({ example: 24.5, description: 'Kg realmente surtidos' })
  @IsNumber()
  @Min(0)
  cantidadSurtida!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string
}
