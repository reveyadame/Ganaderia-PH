import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@ganaderia.ph' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string

  @ApiProperty({ example: 'Admin1234!' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string
}
