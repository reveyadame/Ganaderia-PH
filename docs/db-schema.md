# Schema de Base de Datos — Ganadería PH

Definición completa del modelo de datos en formato Prisma Schema.
Ver [business-rules.md](./business-rules.md) para las reglas que gobiernan cada entidad.

**Estado:** Schema vigente al 2026-05-02. Migraciones aplicadas en orden: `20260501060356_initial_migration` → `20260501070000_consolidate_director_role` → `20260502070000_add_notificaciones` → `20260502080000_racion_nombre` → `20260502090000_racion_catalogo`.
**Archivo fuente:** `packages/database/prisma/schema.prisma`
**Cliente generado en:** `packages/database/generated/` (regenerar con `pnpm db:generate` tras cualquier cambio de schema o nueva migración).

**Nota sobre enums:** El generador de Prisma crea sus propios tipos de enum en el cliente generado. En los servicios NestJS que retornan `UsuarioSesion` (de `@ganaderia/shared`), se usa `as` cast para convertir entre los enums de Prisma y los enums de shared, ya que son string-equivalentes pero TypeScript los trata como tipos distintos.

---

## Diagrama de Relaciones (resumen)

```
Organizacion
├── Farmacia (1:N)
│   ├── GrupoCorrales (1:N)  ← una farmacia → muchos grupos
│   │   └── Corral (1:N)
│   └── Medicamento (1:N)
│       └── UnidadMedicamento (1:N)
│           └── SalidaTemporal (1:N)
│           └── BajaMedicamento (1:1)
│
├── Animal
│   ├── Corral (N:1)
│   ├── Lote (N:1, opcional)
│   ├── AsignacionAreteBlanco (1:N)
│   └── AplicacionTratamiento (1:N)
│       └── AplicacionTratamientoItem (1:N)
│
├── TratamientoTemplate
│   └── TratamientoTemplateItem (1:N)
│
├── EstadoComederoConfig (catálogo configurable por organización)
├── LecturaComedor (→ Corral, → EstadoComederoConfig)
├── RacionCatalogo (catálogo de raciones por organización)
│   └── RacionDefinicion (→ Corral, → RacionCatalogo opcional, nombre + kgManana + kgTarde)
│       └── SurtidoRacion (→ Corral, → RacionDefinicion, turno: MANANA | TARDE)
│
└── Notificacion (DIRECTOR/SUPERUSUARIO → operadores)
    ├── NotificacionDestinatario (1:N)
    └── NotificacionLectura (1:N, lectura/confirmación por destinatario)

Usuario
├── UsuarioActividad (1:N)
└── UsuarioGrupoCorrales (1:N)
```

---

## Prisma Schema Completo

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum TipoUsuario {
  SUPERUSUARIO
  DIRECTOR     // consolidación de ADMIN + DIRECTOR (mig. consolidate_director_role)
  OPERADOR
}

enum ActividadUsuario {
  REGISTRO
  TRATAMIENTOS
  COMEDEROS
  RACIONES
  FARMACIA
  REPORTES
}

enum SexoAnimal {
  MACHO
  HEMBRA
}

enum EstadoAnimal {
  ACTIVO
  EGRESADO
  MUERTO
  BAJA
}

enum PresentacionMedicamento {
  FRASCO
  AMPOLLETA
  TABLETA
  SOBRE
  TUBO
  JERINGA
  OTRO
}

enum UnidadMedida {
  ML
  L
  GR
  KG
  TABLETA
  UNIDAD
}

enum EstadoUnidadMedicamento {
  PRE_INGRESO
  DISPONIBLE
  SALIDA_TEMPORAL
  CONSUMIDO
  BAJA
}

enum EstadoRegreso {
  REGRESO_CON_CONTENIDO
  REGRESO_VACIO
}

enum TipoBajaMedicamento {
  CONSUMO_CAMPO
  CADUCIDAD
  PERDIDA
  ROBO
  DAÑO
  AJUSTE
}

enum EstadoAreteBlanco {
  DISPONIBLE
  ASIGNADO
}

enum TurnoRacion {
  MANANA
  TARDE
}

enum CausaEgresoAnimal {
  VENTA
  MUERTE
  TRASLADO
  OTRO
}

enum PrioridadNotificacion {
  INFO
  AVISO
  CRITICA
}

enum AccionAudit {
  CREATE
  UPDATE
  DELETE
}

// ─────────────────────────────────────────────
// ORGANIZACIÓN
// ─────────────────────────────────────────────

model Organizacion {
  id          String   @id @default(cuid())
  nombre      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  farmacias        Farmacia[]
  gruposCorrales   GrupoCorrales[]
  animales         Animal[]
  aretessBlancos   AreteBlanco[]
  usuarios         Usuario[]
  templates        TratamientoTemplate[]
  estadosComedero  EstadoComederoConfig[]
  racionesCatalogo RacionCatalogo[]
  notificaciones   Notificacion[]
}

// ─────────────────────────────────────────────
// FARMACIA
// ─────────────────────────────────────────────

model Farmacia {
  id              String   @id @default(cuid())
  organizacionId  String
  nombre          String
  descripcion     String?
  activa          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organizacion    Organizacion    @relation(fields: [organizacionId], references: [id])
  gruposCorrales  GrupoCorrales[]
  medicamentos    Medicamento[]
  unidades        UnidadMedicamento[]
}

// ─────────────────────────────────────────────
// ESTRUCTURA DE CORRALES
// ─────────────────────────────────────────────

model GrupoCorrales {
  id              String   @id @default(cuid())
  organizacionId  String
  farmaciaId      String
  nombre          String   // "Corrales Matriz", "Corrales El Álamo"
  descripcion     String?
  activo          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organizacion        Organizacion          @relation(fields: [organizacionId], references: [id])
  farmacia            Farmacia              @relation(fields: [farmaciaId], references: [id])
  corrales            Corral[]
  usuariosAsignados   UsuarioGrupoCorrales[]
}

model Corral {
  id              String   @id @default(cuid())
  grupoCorralesId String
  codigo          String   // código escaneable (barcode/QR)
  nombre          String
  capacidad       Int?
  activo          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  grupoCorrales   GrupoCorrales      @relation(fields: [grupoCorralesId], references: [id])
  animales        Animal[]
  lotes           Lote[]
  lecturasComedor LecturaComedor[]
  raciones        RacionDefinicion[]
  surtidos        SurtidoRacion[]

  @@unique([grupoCorralesId, codigo])
  @@index([codigo])
}

// ─────────────────────────────────────────────
// ANIMALES
// ─────────────────────────────────────────────

model Lote {
  id              String   @id @default(cuid())
  corralId        String
  codigo          String
  procedencia     String?
  fechaEntrada    DateTime @default(now())
  numAnimalesEsperados Int?
  createdById     String
  createdAt       DateTime @default(now())

  corral          Corral   @relation(fields: [corralId], references: [id])
  creadoPor       Usuario  @relation("LoteCreador", fields: [createdById], references: [id])
  animales        Animal[]
}

model Animal {
  id              String       @id @default(cuid())
  organizacionId  String
  corralId        String
  loteId          String?
  areteSiniiga    String?      // arete amarillo SINIIGA, único global
  sexo            SexoAnimal
  pesoEntrada     Decimal      @db.Decimal(8, 2)
  fechaEntrada    DateTime
  estado          EstadoAnimal @default(ACTIVO)
  fechaEgreso     DateTime?
  causaEgreso     CausaEgresoAnimal?
  precioVenta     Decimal?     @db.Decimal(10, 2)
  notas           String?
  createdById     String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  organizacion        Organizacion             @relation(fields: [organizacionId], references: [id])
  corral              Corral                   @relation(fields: [corralId], references: [id])
  lote                Lote?                    @relation(fields: [loteId], references: [id])
  creadoPor           Usuario                  @relation("AnimalCreador", fields: [createdById], references: [id])
  asignacionesArete   AsignacionAreteBlanco[]
  aplicaciones        AplicacionTratamiento[]

  @@unique([organizacionId, areteSiniiga])
  @@index([areteSiniiga])
  @@index([corralId, estado])
}

model AreteBlanco {
  id              String            @id @default(cuid())
  organizacionId  String
  codigo          String            // código escaneable
  estado          EstadoAreteBlanco @default(DISPONIBLE)
  createdAt       DateTime          @default(now())

  organizacion    Organizacion            @relation(fields: [organizacionId], references: [id])
  asignaciones    AsignacionAreteBlanco[]

  @@unique([organizacionId, codigo])
  @@index([codigo])
}

model AsignacionAreteBlanco {
  id              String    @id @default(cuid())
  areteBlancoId   String
  animalId        String
  asignadoPorId   String
  fechaAsignacion DateTime  @default(now())
  liberadoPorId   String?
  fechaLiberacion DateTime?

  areteBlanco     AreteBlanco @relation(fields: [areteBlancoId], references: [id])
  animal          Animal      @relation(fields: [animalId], references: [id])
  asignadoPor     Usuario     @relation("AsignacionCreador", fields: [asignadoPorId], references: [id])
  liberadoPor     Usuario?    @relation("AsignacionLiberador", fields: [liberadoPorId], references: [id])

  @@index([areteBlancoId, fechaLiberacion])
  @@index([animalId, fechaLiberacion])
}

// ─────────────────────────────────────────────
// MEDICAMENTOS E INVENTARIO
// ─────────────────────────────────────────────

model Medicamento {
  id                    String                  @id @default(cuid())
  farmaciaId            String
  nombre                String
  nombreGenerico        String?
  presentacion          PresentacionMedicamento
  volumenPresentacion   Decimal                 @db.Decimal(10, 3) // ej: 500 (ml), 100 (tabletas)
  unidadMedida          UnidadMedida
  stockMinimo           Int                     @default(0)
  activo                Boolean                 @default(true)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt

  farmacia              Farmacia                 @relation(fields: [farmaciaId], references: [id])
  unidades              UnidadMedicamento[]
  templateItems         TratamientoTemplateItem[]
  aplicacionItems       AplicacionTratamientoItem[]

  @@index([farmaciaId, activo])
}

model UnidadMedicamento {
  id                String                  @id @default(cuid())
  medicamentoId     String
  farmaciaId        String
  costoUnitario     Decimal                 @db.Decimal(10, 2)
  costoPorMedida    Decimal                 @db.Decimal(10, 4) // calculado: costoUnitario / volumenPresentacion
  estado            EstadoUnidadMedicamento @default(DISPONIBLE)
  fechaEntrada      DateTime                @default(now())
  fechaEstadoCambio DateTime                @default(now())
  ingresadoPorId    String
  notasProveedor    String?
  createdAt         DateTime                @default(now())

  medicamento     Medicamento       @relation(fields: [medicamentoId], references: [id])
  farmacia        Farmacia          @relation(fields: [farmaciaId], references: [id])
  ingresadoPor    Usuario           @relation("UnidadIngresador", fields: [ingresadoPorId], references: [id])
  salidasTemporales SalidaTemporal[]
  baja            BajaMedicamento?

  @@index([medicamentoId, farmaciaId, estado, fechaEntrada])
}

model SalidaTemporal {
  id                  String         @id @default(cuid())
  unidadMedicamentoId String
  medicoId            String
  autorizadoPorId     String
  fechaSalida         DateTime       @default(now())
  fechaRegreso        DateTime?
  estadoRegreso       EstadoRegreso?
  notas               String?
  createdAt           DateTime       @default(now())

  unidadMedicamento   UnidadMedicamento @relation(fields: [unidadMedicamentoId], references: [id])
  medico              Usuario           @relation("SalidaMedico", fields: [medicoId], references: [id])
  autorizadoPor       Usuario           @relation("SalidaAutorizador", fields: [autorizadoPorId], references: [id])

  @@index([medicoId, fechaRegreso])
  @@index([unidadMedicamentoId])
}

model BajaMedicamento {
  id                  String              @id @default(cuid())
  unidadMedicamentoId String              @unique
  tipo                TipoBajaMedicamento
  justificacion       String?
  registradoPorId     String
  fecha               DateTime            @default(now())
  createdAt           DateTime            @default(now())

  unidadMedicamento   UnidadMedicamento @relation(fields: [unidadMedicamentoId], references: [id])
  registradoPor       Usuario           @relation("BajaRegistrador", fields: [registradoPorId], references: [id])
}

// ─────────────────────────────────────────────
// TRATAMIENTOS
// ─────────────────────────────────────────────

model TratamientoTemplate {
  id              String   @id @default(cuid())
  organizacionId  String
  nombre          String   // "Kit Inicial", "Kit Resfriado"
  descripcion     String?
  activo          Boolean  @default(true)
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organizacion    Organizacion              @relation(fields: [organizacionId], references: [id])
  creadoPor       Usuario                   @relation("TemplateCreador", fields: [createdById], references: [id])
  items           TratamientoTemplateItem[]
  aplicaciones    AplicacionTratamiento[]
}

model TratamientoTemplateItem {
  id              String       @id @default(cuid())
  templateId      String
  medicamentoId   String
  dosis           Decimal      @db.Decimal(10, 3)
  unidadDosis     UnidadMedida
  orden           Int          @default(0)

  template        TratamientoTemplate @relation(fields: [templateId], references: [id])
  medicamento     Medicamento         @relation(fields: [medicamentoId], references: [id])
}

model AplicacionTratamiento {
  id                  String   @id @default(cuid())
  animalId            String
  aplicadoPorId       String
  fechaAplicacion     DateTime @default(now())
  templateId          String?  // null si es aplicación individual
  templateSnapshot    Json?    // copia inmutable del kit al momento de aplicar
  notas               String?
  costoTotalCalculado Decimal  @db.Decimal(10, 2)
  createdAt           DateTime @default(now())

  animal          Animal                     @relation(fields: [animalId], references: [id])
  aplicadoPor     Usuario                    @relation("AplicacionOperador", fields: [aplicadoPorId], references: [id])
  template        TratamientoTemplate?       @relation(fields: [templateId], references: [id])
  items           AplicacionTratamientoItem[]

  @@index([animalId, fechaAplicacion])
}

model AplicacionTratamientoItem {
  id                    String       @id @default(cuid())
  aplicacionId          String
  medicamentoId         String
  dosisAplicada         Decimal      @db.Decimal(10, 3)
  unidadDosis           UnidadMedida
  costoPorMedidaMomento Decimal      @db.Decimal(10, 4) // inmutable, FIFO al momento de aplicar
  costoItemCalculado    Decimal      @db.Decimal(10, 2) // dosisAplicada * costoPorMedidaMomento

  aplicacion    AplicacionTratamiento @relation(fields: [aplicacionId], references: [id])
  medicamento   Medicamento           @relation(fields: [medicamentoId], references: [id])
}

// ─────────────────────────────────────────────
// COMEDEROS Y RACIONES
// ─────────────────────────────────────────────

// Catálogo configurable de estados del comedero por organización.
// Ejemplos: "Con comida", "Bien", "Lamido", "Muy lamido". Definidos por DIRECTOR.
model EstadoComederoConfig {
  id             String   @id @default(cuid())
  organizacionId String
  nombre         String
  orden          Int      @default(0)
  color          String?  // hex para UI (ej: "#22c55e")
  activo         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organizacion Organizacion     @relation(fields: [organizacionId], references: [id])
  lecturas     LecturaComedor[]

  @@unique([organizacionId, nombre])
  @@index([organizacionId, activo, orden])
}

// Lectura cualitativa del estado del comedero. Independiente del surtido.
model LecturaComedor {
  id              String   @id @default(cuid())
  corralId        String
  estadoConfigId  String
  registradoPorId String
  fechaLectura    DateTime @default(now())
  notas           String?
  createdAt       DateTime @default(now())

  corral        Corral               @relation(fields: [corralId], references: [id])
  estadoConfig  EstadoComederoConfig @relation(fields: [estadoConfigId], references: [id])
  registradoPor Usuario              @relation("LecturaRegistrador", fields: [registradoPorId], references: [id])

  @@index([corralId, fechaLectura])
  @@index([estadoConfigId])
}

// Catálogo de raciones por organización (solo nombres + descripción).
// Las cantidades por turno NO viven aquí — se definen por corral en RacionDefinicion.
model RacionCatalogo {
  id             String   @id @default(cuid())
  organizacionId String
  nombre         String
  descripcion    String?
  activo         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organizacion Organizacion       @relation(fields: [organizacionId], references: [id])
  definiciones RacionDefinicion[]

  @@unique([organizacionId, nombre])
  @@index([organizacionId, activo])
}

// Ración diaria por corral, dividida en mañana/tarde (kg). Captura manual del director.
// El nombre se copia desde RacionCatalogo al crear; catalogoId queda como referencia trazable.
model RacionDefinicion {
  id               String    @id @default(cuid())
  corralId         String
  definidaPorId    String
  catalogoId       String?
  nombre           String
  cantidadKgManana Decimal   @db.Decimal(10, 2)
  cantidadKgTarde  Decimal   @db.Decimal(10, 2)
  descripcion      String?
  fechaInicio      DateTime  @default(now())
  fechaFin         DateTime?
  activa           Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  corral      Corral          @relation(fields: [corralId], references: [id])
  definidaPor Usuario         @relation("RacionDefinidor", fields: [definidaPorId], references: [id])
  catalogo    RacionCatalogo? @relation(fields: [catalogoId], references: [id])
  surtidos    SurtidoRacion[]

  @@index([corralId, activa])
  @@index([catalogoId])
}

// Registro del surtido real por turno. Un corral puede tener 1 o 2 surtidos por día.
model SurtidoRacion {
  id                 String      @id @default(cuid())
  corralId           String
  racionDefinicionId String?
  surtidoPorId       String
  turno              TurnoRacion
  fechaSurtido       DateTime    @default(now())
  cantidadDefinida   Decimal?    @db.Decimal(10, 2)
  cantidadSurtida    Decimal     @db.Decimal(10, 2)
  diferencia         Decimal?    @db.Decimal(10, 2)
  notas              String?
  createdAt          DateTime    @default(now())

  corral           Corral            @relation(fields: [corralId], references: [id])
  racionDefinicion RacionDefinicion? @relation(fields: [racionDefinicionId], references: [id])
  surtidoPor       Usuario           @relation("SurtidoOperador", fields: [surtidoPorId], references: [id])

  @@index([corralId, fechaSurtido])
  @@index([corralId, turno, fechaSurtido])
}

// ─────────────────────────────────────────────
// USUARIOS Y PERMISOS
// ─────────────────────────────────────────────

model Usuario {
  id              String      @id @default(cuid())
  organizacionId  String
  nombre          String
  apellido        String
  email           String      @unique
  passwordHash    String
  tipo            TipoUsuario
  activo          Boolean     @default(true)
  ultimoAcceso    DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  organizacion    Organizacion @relation(fields: [organizacionId], references: [id])

  // Asignaciones de permisos (solo OPERADOR)
  actividades         UsuarioActividad[]
  gruposCorrales      UsuarioGrupoCorrales[]

  // Relaciones de autoría y operación
  lotesCreados        Lote[]                    @relation("LoteCreador")
  animalesCreados     Animal[]                  @relation("AnimalCreador")
  asignacionesCreadas AsignacionAreteBlanco[]   @relation("AsignacionCreador")
  asignacionesLiberadas AsignacionAreteBlanco[] @relation("AsignacionLiberador")
  unidadesIngresadas  UnidadMedicamento[]       @relation("UnidadIngresador")
  salidasComoMedico   SalidaTemporal[]          @relation("SalidaMedico")
  salidasAutorizadas  SalidaTemporal[]          @relation("SalidaAutorizador")
  bajasRegistradas    BajaMedicamento[]         @relation("BajaRegistrador")
  templatesCreados    TratamientoTemplate[]     @relation("TemplateCreador")
  aplicaciones        AplicacionTratamiento[]   @relation("AplicacionOperador")
  lecturasComedor     LecturaComedor[]          @relation("LecturaRegistrador")
  racionesDefinidas   RacionDefinicion[]        @relation("RacionDefinidor")
  surtidos            SurtidoRacion[]           @relation("SurtidoOperador")

  @@index([email])
  @@index([organizacionId, tipo, activo])
}

model UsuarioActividad {
  id          String           @id @default(cuid())
  usuarioId   String
  actividad   ActividadUsuario

  usuario     Usuario @relation(fields: [usuarioId], references: [id])

  @@unique([usuarioId, actividad])
}

model UsuarioGrupoCorrales {
  id              String @id @default(cuid())
  usuarioId       String
  grupoCorralesId String

  usuario         Usuario       @relation(fields: [usuarioId], references: [id])
  grupoCorrales   GrupoCorrales @relation(fields: [grupoCorralesId], references: [id])

  @@unique([usuarioId, grupoCorralesId])
}

// ─────────────────────────────────────────────
// AUDITORÍA
// ─────────────────────────────────────────────

model AuditLog {
  id              String      @id @default(cuid())
  usuarioId       String?
  entidad         String      // nombre del modelo afectado
  entidadId       String
  accion          AccionAudit
  datosAnteriores Json?
  datosNuevos     Json?
  ipAddress       String?
  createdAt       DateTime    @default(now())

  @@index([entidad, entidadId])
  @@index([usuarioId, createdAt])
}

// ─────────────────────────────────────────────
// NOTIFICACIONES
// ─────────────────────────────────────────────

// Notificación interna emitida por DIRECTOR/SUPERUSUARIO a una lista explícita
// de operadores destinatarios. No hay broadcasts implícitos por rol/grupo.
model Notificacion {
  id             String                @id @default(cuid())
  organizacionId String
  autorId        String
  titulo         String
  mensaje        String
  prioridad      PrioridadNotificacion @default(INFO)
  expiraEn       DateTime?
  createdAt      DateTime              @default(now())

  organizacion  Organizacion               @relation(fields: [organizacionId], references: [id])
  autor         Usuario                    @relation("NotificacionAutor", fields: [autorId], references: [id])
  destinatarios NotificacionDestinatario[]
  lecturas      NotificacionLectura[]

  @@index([organizacionId, createdAt])
  @@index([autorId, createdAt])
}

model NotificacionDestinatario {
  id             String @id @default(cuid())
  notificacionId String
  usuarioId      String

  notificacion Notificacion @relation(fields: [notificacionId], references: [id], onDelete: Cascade)
  usuario      Usuario      @relation("NotificacionDestinatario", fields: [usuarioId], references: [id])

  @@unique([notificacionId, usuarioId])
  @@index([usuarioId])
}

// Eventos de lectura/confirmación por destinatario.
// `confirmadaEn` es opcional; las notificaciones CRITICA suelen exigir confirmación explícita.
model NotificacionLectura {
  id             String    @id @default(cuid())
  notificacionId String
  usuarioId      String
  leidaEn        DateTime  @default(now())
  confirmadaEn   DateTime?

  notificacion Notificacion @relation(fields: [notificacionId], references: [id], onDelete: Cascade)
  usuario      Usuario      @relation("NotificacionLectura", fields: [usuarioId], references: [id])

  @@unique([notificacionId, usuarioId])
  @@index([usuarioId])
}
```

---

## Notas de Implementación

### Cálculo de `costoPorMedida` en `UnidadMedicamento`
Se calcula automáticamente en el servicio antes de persistir:
```typescript
costoPorMedida = costoUnitario / medicamento.volumenPresentacion
```

### Lectura del comedero (cualitativa)
La lectura solo guarda el estado del comedero (FK a `EstadoComederoConfig`). No hay cantidades numéricas. Sirve como insumo para que el admin defina la siguiente ración. Ver `BR-CO-*`.

### Cálculo de `cantidadDefinida` al surtir
```typescript
// Al registrar SurtidoRacion, copiar la cantidad del turno desde la ración activa:
cantidadDefinida = turno === 'MANANA'
  ? racionActiva.cantidadKgManana
  : racionActiva.cantidadKgTarde
```

### Cálculo de `diferencia` en `SurtidoRacion`
```typescript
diferencia = cantidadSurtida - cantidadDefinida
// Positivo = surtió de más; negativo = surtió de menos
```

### Sugerencia de turno en UI de surtido
```typescript
// Frontend sugiere por hora del día, operador puede cambiar manualmente:
turnoSugerido = new Date().getHours() < 14 ? 'MANANA' : 'TARDE'
```

### Lógica FIFO para `costoPorMedidaMomento` al aplicar tratamiento
```typescript
const unidadVigente = await prisma.unidadMedicamento.findFirst({
  where: {
    medicamentoId,
    farmaciaId,        // farmacia del GrupoCorrales del animal
    estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] }
  },
  orderBy: { fechaEntrada: 'asc' }  // la más antigua primero
})
costoPorMedidaMomento = unidadVigente.costoPorMedida
```
