import { PrismaClient, TipoUsuario } from '../generated'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Organización
  const org = await prisma.organizacion.upsert({
    where: { id: 'org-default' },
    update: {},
    create: {
      id: 'org-default',
      nombre: 'Ganadería PH',
    },
  })
  console.log('✓ Organización creada:', org.nombre)

  // Superusuario
  const hash = await bcrypt.hash('Admin1234!', 12)
  const superuser = await prisma.usuario.upsert({
    where: { email: 'admin@ganaderia.ph' },
    update: {},
    create: {
      organizacionId: org.id,
      nombre: 'Super',
      apellido: 'Admin',
      email: 'admin@ganaderia.ph',
      passwordHash: hash,
      tipo: TipoUsuario.SUPERUSUARIO,
    },
  })
  console.log('✓ Superusuario creado:', superuser.email)

  // Farmacia base
  const farmacia = await prisma.farmacia.upsert({
    where: { id: 'farmacia-matriz' },
    update: {},
    create: {
      id: 'farmacia-matriz',
      organizacionId: org.id,
      nombre: 'Farmacia Matriz',
      descripcion: 'Almacén principal de medicamentos',
    },
  })
  console.log('✓ Farmacia creada:', farmacia.nombre)

  // Grupo de corrales
  const grupo = await prisma.grupoCorrales.upsert({
    where: { id: 'grupo-matriz' },
    update: {},
    create: {
      id: 'grupo-matriz',
      organizacionId: org.id,
      farmaciaId: farmacia.id,
      nombre: 'Corrales Matriz',
      descripcion: 'Instalaciones principales',
    },
  })
  console.log('✓ GrupoCorrales creado:', grupo.nombre)

  // Corrales de ejemplo
  const corrales = ['C-01', 'C-02', 'C-03', 'C-04', 'C-05']
  for (const codigo of corrales) {
    await prisma.corral.upsert({
      where: { grupoCorralesId_codigo: { grupoCorralesId: grupo.id, codigo } },
      update: {},
      create: {
        grupoCorralesId: grupo.id,
        codigo,
        nombre: `Corral ${codigo}`,
        capacidad: 50,
      },
    })
  }
  console.log(`✓ ${corrales.length} corrales creados`)

  console.log('\n✅ Seed completado exitosamente')
  console.log('─────────────────────────────────')
  console.log('Credenciales de acceso:')
  console.log('  Email:    admin@ganaderia.ph')
  console.log('  Password: Admin1234!')
  console.log('─────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
