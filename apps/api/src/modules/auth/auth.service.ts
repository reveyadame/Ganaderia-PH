import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtPayload, UsuarioSesion } from '@ganaderia/shared'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; usuario: UsuarioSesion }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        actividades: true,
        gruposCorrales: true,
      },
    })

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    const passwordValido = await bcrypt.compare(dto.password, usuario.passwordHash)
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    })

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
      organizacionId: usuario.organizacionId,
    }

    const accessToken = await this.jwt.signAsync(payload)

    const sesion = this.toSesion(usuario)
    return { accessToken, usuario: sesion }
  }

  async validateUsuario(payload: JwtPayload): Promise<UsuarioSesion> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        actividades: true,
        gruposCorrales: true,
      },
    })

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo')
    }

    return this.toSesion(usuario)
  }

  private toSesion(usuario: {
    id: string
    nombre: string
    apellido: string
    email: string
    tipo: string
    organizacionId: string
    actividades: { actividad: string }[]
    gruposCorrales: { grupoCorralesId: string }[]
  }): UsuarioSesion {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      tipo: usuario.tipo as UsuarioSesion['tipo'],
      organizacionId: usuario.organizacionId,
      actividades: usuario.actividades.map((a) => a.actividad as UsuarioSesion['actividades'][number]),
      gruposCorralesIds: usuario.gruposCorrales.map((g) => g.grupoCorralesId),
    }
  }
}
