import { IsString, IsEmail, IsEnum, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  apellido!: string

  @ApiProperty({ example: 'juan@ganaderia.ph' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'Segura1234!' })
  @IsString()
  @MinLength(8)
  password!: string

  @ApiProperty({ enum: TipoUsuario })
  @IsEnum(TipoUsuario)
  tipo!: TipoUsuario

  @ApiPropertyOptional({ enum: ActividadUsuario, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ActividadUsuario, { each: true })
  actividades?: ActividadUsuario[]

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gruposCorralesIds?: string[]
}
