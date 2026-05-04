-- Notificaciones del Superusuario/Director hacia operadores

-- CreateEnum
CREATE TYPE "PrioridadNotificacion" AS ENUM ('INFO', 'AVISO', 'CRITICA');

-- CreateTable
CREATE TABLE "Notificacion" (
  "id"             TEXT NOT NULL,
  "organizacionId" TEXT NOT NULL,
  "autorId"        TEXT NOT NULL,
  "titulo"         TEXT NOT NULL,
  "mensaje"        TEXT NOT NULL,
  "prioridad"      "PrioridadNotificacion" NOT NULL DEFAULT 'INFO',
  "expiraEn"       TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notificacion_organizacionId_createdAt_idx" ON "Notificacion"("organizacionId", "createdAt");
CREATE INDEX "Notificacion_autorId_createdAt_idx" ON "Notificacion"("autorId", "createdAt");

ALTER TABLE "Notificacion"
  ADD CONSTRAINT "Notificacion_organizacionId_fkey"
  FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notificacion"
  ADD CONSTRAINT "Notificacion_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "NotificacionDestinatario" (
  "id"             TEXT NOT NULL,
  "notificacionId" TEXT NOT NULL,
  "usuarioId"      TEXT NOT NULL,
  CONSTRAINT "NotificacionDestinatario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificacionDestinatario_notificacionId_usuarioId_key"
  ON "NotificacionDestinatario"("notificacionId", "usuarioId");
CREATE INDEX "NotificacionDestinatario_usuarioId_idx" ON "NotificacionDestinatario"("usuarioId");

ALTER TABLE "NotificacionDestinatario"
  ADD CONSTRAINT "NotificacionDestinatario_notificacionId_fkey"
  FOREIGN KEY ("notificacionId") REFERENCES "Notificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificacionDestinatario"
  ADD CONSTRAINT "NotificacionDestinatario_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "NotificacionLectura" (
  "id"             TEXT NOT NULL,
  "notificacionId" TEXT NOT NULL,
  "usuarioId"      TEXT NOT NULL,
  "leidaEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmadaEn"   TIMESTAMP(3),
  CONSTRAINT "NotificacionLectura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificacionLectura_notificacionId_usuarioId_key"
  ON "NotificacionLectura"("notificacionId", "usuarioId");
CREATE INDEX "NotificacionLectura_usuarioId_idx" ON "NotificacionLectura"("usuarioId");

ALTER TABLE "NotificacionLectura"
  ADD CONSTRAINT "NotificacionLectura_notificacionId_fkey"
  FOREIGN KEY ("notificacionId") REFERENCES "Notificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificacionLectura"
  ADD CONSTRAINT "NotificacionLectura_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
