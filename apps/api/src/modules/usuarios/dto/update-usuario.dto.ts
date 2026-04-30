import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, IsEmail, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { TipoUsuario } from '@ganaderia/shared'

export class UpdateUsuarioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  apellido?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ description: 'Dejar vacío para no cambiar la contraseña' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string

  @ApiPropertyOptional({ enum: TipoUsuario })
  @IsOptional()
  @IsEnum(TipoUsuario)
  tipo?: TipoUsuario

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean
}
