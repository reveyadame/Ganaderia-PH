import { IsString, IsEnum, IsOptional, IsArray, ArrayMinSize, IsDateString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PrioridadNotificacion } from '@ganaderia/shared'

export class CreateNotificacionDto {
  @ApiProperty({ example: 'Stock bajo de Ivermectina' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  titulo!: string

  @ApiProperty({ example: 'Por favor pidan autorización antes de aplicar tratamientos con Ivermectina hoy.' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  mensaje!: string

  @ApiPropertyOptional({ enum: PrioridadNotificacion, default: PrioridadNotificacion.INFO })
  @IsOptional()
  @IsEnum(PrioridadNotificacion)
  prioridad?: PrioridadNotificacion

  @ApiProperty({ type: [String], description: 'IDs de usuarios destinatarios' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  destinatariosIds!: string[]

  @ApiPropertyOptional({ description: 'Fecha de expiración ISO (opcional)' })
  @IsOptional()
  @IsDateString()
  expiraEn?: string
}
