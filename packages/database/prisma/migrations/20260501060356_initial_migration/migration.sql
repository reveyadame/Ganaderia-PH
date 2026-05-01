-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('SUPERUSUARIO', 'ADMIN', 'DIRECTOR', 'OPERADOR');

-- CreateEnum
CREATE TYPE "ActividadUsuario" AS ENUM ('REGISTRO', 'TRATAMIENTOS', 'COMEDEROS', 'RACIONES', 'FARMACIA', 'REPORTES');

-- CreateEnum
CREATE TYPE "SexoAnimal" AS ENUM ('MACHO', 'HEMBRA');

-- CreateEnum
CREATE TYPE "EstadoAnimal" AS ENUM ('ACTIVO', 'EGRESADO', 'MUERTO', 'BAJA');

-- CreateEnum
CREATE TYPE "PresentacionMedicamento" AS ENUM ('FRASCO', 'AMPOLLETA', 'TABLETA', 'SOBRE', 'TUBO', 'JERINGA', 'OTRO');

-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('ML', 'L', 'GR', 'KG', 'TABLETA', 'UNIDAD');

-- CreateEnum
CREATE TYPE "EstadoUnidadMedicamento" AS ENUM ('PRE_INGRESO', 'DISPONIBLE', 'SALIDA_TEMPORAL', 'CONSUMIDO', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoRegreso" AS ENUM ('REGRESO_CON_CONTENIDO', 'REGRESO_VACIO');

-- CreateEnum
CREATE TYPE "TipoBajaMedicamento" AS ENUM ('CONSUMO_CAMPO', 'CADUCIDAD', 'PERDIDA', 'ROBO', 'DANO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoAreteBlanco" AS ENUM ('DISPONIBLE', 'ASIGNADO');

-- CreateEnum
CREATE TYPE "TurnoRacion" AS ENUM ('MANANA', 'TARDE');

-- CreateEnum
CREATE TYPE "CausaEgresoAnimal" AS ENUM ('VENTA', 'MUERTE', 'TRASLADO', 'OTRO');

-- CreateEnum
CREATE TYPE "AccionAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "Organizacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farmacia" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmacia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoCorrales" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoCorrales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corral" (
    "id" TEXT NOT NULL,
    "grupoCorralesId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "corralId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "procedencia" TEXT,
    "fechaEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numAnimalesEsperados" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "corralId" TEXT NOT NULL,
    "loteId" TEXT,
    "areteSiniiga" TEXT,
    "sexo" "SexoAnimal" NOT NULL,
    "pesoEntrada" DECIMAL(8,2) NOT NULL,
    "fechaEntrada" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoAnimal" NOT NULL DEFAULT 'ACTIVO',
    "fechaEgreso" TIMESTAMP(3),
    "causaEgreso" "CausaEgresoAnimal",
    "precioVenta" DECIMAL(10,2),
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreteBlanco" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "estado" "EstadoAreteBlanco" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreteBlanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionAreteBlanco" (
    "id" TEXT NOT NULL,
    "areteBlancoId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "asignadoPorId" TEXT NOT NULL,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liberadoPorId" TEXT,
    "fechaLiberacion" TIMESTAMP(3),

    CONSTRAINT "AsignacionAreteBlanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicamento" (
    "id" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreGenerico" TEXT,
    "presentacion" "PresentacionMedicamento" NOT NULL,
    "volumenPresentacion" DECIMAL(10,3) NOT NULL,
    "unidadMedida" "UnidadMedida" NOT NULL,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadMedicamento" (
    "id" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "farmaciaId" TEXT NOT NULL,
    "costoUnitario" DECIMAL(10,2) NOT NULL,
    "costoPorMedida" DECIMAL(10,4) NOT NULL,
    "estado" "EstadoUnidadMedicamento" NOT NULL DEFAULT 'DISPONIBLE',
    "fechaEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEstadoCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingresadoPorId" TEXT NOT NULL,
    "notasProveedor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnidadMedicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalidaTemporal" (
    "id" TEXT NOT NULL,
    "unidadMedicamentoId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "autorizadoPorId" TEXT NOT NULL,
    "fechaSalida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRegreso" TIMESTAMP(3),
    "estadoRegreso" "EstadoRegreso",
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalidaTemporal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BajaMedicamento" (
    "id" TEXT NOT NULL,
    "unidadMedicamentoId" TEXT NOT NULL,
    "tipo" "TipoBajaMedicamento" NOT NULL,
    "justificacion" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BajaMedicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TratamientoTemplate" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TratamientoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TratamientoTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "dosis" DECIMAL(10,3) NOT NULL,
    "unidadDosis" "UnidadMedida" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TratamientoTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AplicacionTratamiento" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "aplicadoPorId" TEXT NOT NULL,
    "fechaAplicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateId" TEXT,
    "templateSnapshot" JSONB,
    "notas" TEXT,
    "costoTotalCalculado" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AplicacionTratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AplicacionTratamientoItem" (
    "id" TEXT NOT NULL,
    "aplicacionId" TEXT NOT NULL,
    "medicamentoId" TEXT NOT NULL,
    "dosisAplicada" DECIMAL(10,3) NOT NULL,
    "unidadDosis" "UnidadMedida" NOT NULL,
    "costoPorMedidaMomento" DECIMAL(10,4) NOT NULL,
    "costoItemCalculado" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "AplicacionTratamientoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoComederoConfig" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoComederoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturaComedor" (
    "id" TEXT NOT NULL,
    "corralId" TEXT NOT NULL,
    "estadoConfigId" TEXT NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "fechaLectura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturaComedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RacionDefinicion" (
    "id" TEXT NOT NULL,
    "corralId" TEXT NOT NULL,
    "definidaPorId" TEXT NOT NULL,
    "cantidadKgManana" DECIMAL(10,2) NOT NULL,
    "cantidadKgTarde" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RacionDefinicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurtidoRacion" (
    "id" TEXT NOT NULL,
    "corralId" TEXT NOT NULL,
    "racionDefinicionId" TEXT,
    "surtidoPorId" TEXT NOT NULL,
    "turno" "TurnoRacion" NOT NULL,
    "fechaSurtido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadDefinida" DECIMAL(10,2),
    "cantidadSurtida" DECIMAL(10,2) NOT NULL,
    "diferencia" DECIMAL(10,2),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurtidoRacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioActividad" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "actividad" "ActividadUsuario" NOT NULL,

    CONSTRAINT "UsuarioActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioGrupoCorrales" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "grupoCorralesId" TEXT NOT NULL,

    CONSTRAINT "UsuarioGrupoCorrales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" "AccionAudit" NOT NULL,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Corral_codigo_idx" ON "Corral"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Corral_grupoCorralesId_codigo_key" ON "Corral"("grupoCorralesId", "codigo");

-- CreateIndex
CREATE INDEX "Animal_areteSiniiga_idx" ON "Animal"("areteSiniiga");

-- CreateIndex
CREATE INDEX "Animal_corralId_estado_idx" ON "Animal"("corralId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_organizacionId_areteSiniiga_key" ON "Animal"("organizacionId", "areteSiniiga");

-- CreateIndex
CREATE INDEX "AreteBlanco_codigo_idx" ON "AreteBlanco"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AreteBlanco_organizacionId_codigo_key" ON "AreteBlanco"("organizacionId", "codigo");

-- CreateIndex
CREATE INDEX "AsignacionAreteBlanco_areteBlancoId_fechaLiberacion_idx" ON "AsignacionAreteBlanco"("areteBlancoId", "fechaLiberacion");

-- CreateIndex
CREATE INDEX "AsignacionAreteBlanco_animalId_fechaLiberacion_idx" ON "AsignacionAreteBlanco"("animalId", "fechaLiberacion");

-- CreateIndex
CREATE INDEX "Medicamento_farmaciaId_activo_idx" ON "Medicamento"("farmaciaId", "activo");

-- CreateIndex
CREATE INDEX "UnidadMedicamento_medicamentoId_farmaciaId_estado_fechaEntr_idx" ON "UnidadMedicamento"("medicamentoId", "farmaciaId", "estado", "fechaEntrada");

-- CreateIndex
CREATE INDEX "SalidaTemporal_medicoId_fechaRegreso_idx" ON "SalidaTemporal"("medicoId", "fechaRegreso");

-- CreateIndex
CREATE INDEX "SalidaTemporal_unidadMedicamentoId_idx" ON "SalidaTemporal"("unidadMedicamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "BajaMedicamento_unidadMedicamentoId_key" ON "BajaMedicamento"("unidadMedicamentoId");

-- CreateIndex
CREATE INDEX "AplicacionTratamiento_animalId_fechaAplicacion_idx" ON "AplicacionTratamiento"("animalId", "fechaAplicacion");

-- CreateIndex
CREATE INDEX "EstadoComederoConfig_organizacionId_activo_orden_idx" ON "EstadoComederoConfig"("organizacionId", "activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoComederoConfig_organizacionId_nombre_key" ON "EstadoComederoConfig"("organizacionId", "nombre");

-- CreateIndex
CREATE INDEX "LecturaComedor_corralId_fechaLectura_idx" ON "LecturaComedor"("corralId", "fechaLectura");

-- CreateIndex
CREATE INDEX "LecturaComedor_estadoConfigId_idx" ON "LecturaComedor"("estadoConfigId");

-- CreateIndex
CREATE INDEX "RacionDefinicion_corralId_activa_idx" ON "RacionDefinicion"("corralId", "activa");

-- CreateIndex
CREATE INDEX "SurtidoRacion_corralId_fechaSurtido_idx" ON "SurtidoRacion"("corralId", "fechaSurtido");

-- CreateIndex
CREATE INDEX "SurtidoRacion_corralId_turno_fechaSurtido_idx" ON "SurtidoRacion"("corralId", "turno", "fechaSurtido");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_organizacionId_tipo_activo_idx" ON "Usuario"("organizacionId", "tipo", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioActividad_usuarioId_actividad_key" ON "UsuarioActividad"("usuarioId", "actividad");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioGrupoCorrales_usuarioId_grupoCorralesId_key" ON "UsuarioGrupoCorrales"("usuarioId", "grupoCorralesId");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_createdAt_idx" ON "AuditLog"("usuarioId", "createdAt");

-- AddForeignKey
ALTER TABLE "Farmacia" ADD CONSTRAINT "Farmacia_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoCorrales" ADD CONSTRAINT "GrupoCorrales_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoCorrales" ADD CONSTRAINT "GrupoCorrales_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Corral" ADD CONSTRAINT "Corral_grupoCorralesId_fkey" FOREIGN KEY ("grupoCorralesId") REFERENCES "GrupoCorrales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_corralId_fkey" FOREIGN KEY ("corralId") REFERENCES "Corral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_corralId_fkey" FOREIGN KEY ("corralId") REFERENCES "Corral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreteBlanco" ADD CONSTRAINT "AreteBlanco_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAreteBlanco" ADD CONSTRAINT "AsignacionAreteBlanco_areteBlancoId_fkey" FOREIGN KEY ("areteBlancoId") REFERENCES "AreteBlanco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAreteBlanco" ADD CONSTRAINT "AsignacionAreteBlanco_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAreteBlanco" ADD CONSTRAINT "AsignacionAreteBlanco_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAreteBlanco" ADD CONSTRAINT "AsignacionAreteBlanco_liberadoPorId_fkey" FOREIGN KEY ("liberadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicamento" ADD CONSTRAINT "Medicamento_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadMedicamento" ADD CONSTRAINT "UnidadMedicamento_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadMedicamento" ADD CONSTRAINT "UnidadMedicamento_farmaciaId_fkey" FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadMedicamento" ADD CONSTRAINT "UnidadMedicamento_ingresadoPorId_fkey" FOREIGN KEY ("ingresadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalidaTemporal" ADD CONSTRAINT "SalidaTemporal_unidadMedicamentoId_fkey" FOREIGN KEY ("unidadMedicamentoId") REFERENCES "UnidadMedicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalidaTemporal" ADD CONSTRAINT "SalidaTemporal_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalidaTemporal" ADD CONSTRAINT "SalidaTemporal_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BajaMedicamento" ADD CONSTRAINT "BajaMedicamento_unidadMedicamentoId_fkey" FOREIGN KEY ("unidadMedicamentoId") REFERENCES "UnidadMedicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BajaMedicamento" ADD CONSTRAINT "BajaMedicamento_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TratamientoTemplate" ADD CONSTRAINT "TratamientoTemplate_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TratamientoTemplate" ADD CONSTRAINT "TratamientoTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TratamientoTemplateItem" ADD CONSTRAINT "TratamientoTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TratamientoTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TratamientoTemplateItem" ADD CONSTRAINT "TratamientoTemplateItem_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionTratamiento" ADD CONSTRAINT "AplicacionTratamiento_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionTratamiento" ADD CONSTRAINT "AplicacionTratamiento_aplicadoPorId_fkey" FOREIGN KEY ("aplicadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionTratamiento" ADD CONSTRAINT "AplicacionTratamiento_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TratamientoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionTratamientoItem" ADD CONSTRAINT "AplicacionTratamientoItem_aplicacionId_fkey" FOREIGN KEY ("aplicacionId") REFERENCES "AplicacionTratamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionTratamientoItem" ADD CONSTRAINT "AplicacionTratamientoItem_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoComederoConfig" ADD CONSTRAINT "EstadoComederoConfig_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaComedor" ADD CONSTRAINT "LecturaComedor_corralId_fkey" FOREIGN KEY ("corralId") REFERENCES "Corral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaComedor" ADD CONSTRAINT "LecturaComedor_estadoConfigId_fkey" FOREIGN KEY ("estadoConfigId") REFERENCES "EstadoComederoConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaComedor" ADD CONSTRAINT "LecturaComedor_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RacionDefinicion" ADD CONSTRAINT "RacionDefinicion_corralId_fkey" FOREIGN KEY ("corralId") REFERENCES "Corral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RacionDefinicion" ADD CONSTRAINT "RacionDefinicion_definidaPorId_fkey" FOREIGN KEY ("definidaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurtidoRacion" ADD CONSTRAINT "SurtidoRacion_corralId_fkey" FOREIGN KEY ("corralId") REFERENCES "Corral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurtidoRacion" ADD CONSTRAINT "SurtidoRacion_racionDefinicionId_fkey" FOREIGN KEY ("racionDefinicionId") REFERENCES "RacionDefinicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurtidoRacion" ADD CONSTRAINT "SurtidoRacion_surtidoPorId_fkey" FOREIGN KEY ("surtidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioActividad" ADD CONSTRAINT "UsuarioActividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioGrupoCorrales" ADD CONSTRAINT "UsuarioGrupoCorrales_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioGrupoCorrales" ADD CONSTRAINT "UsuarioGrupoCorrales_grupoCorralesId_fkey" FOREIGN KEY ("grupoCorralesId") REFERENCES "GrupoCorrales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
