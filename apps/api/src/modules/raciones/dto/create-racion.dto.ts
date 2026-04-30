import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRacionDto {
  @ApiProperty()
  @IsString()
  corralId!: string

  @ApiProperty({ example: 25.5, description: 'Kg a suministrar en turno mañana' })
  @IsNumber()
  @Min(0)
  cantidadKgManana!: number

  @ApiProperty({ example: 25.5, description: 'Kg a suministrar en turno tarde' })
  @IsNumber()
  @Min(0)
  cantidadKgTarde!: number

  @ApiPropertyOptional({ example: 'Aumento por calor' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string
}
