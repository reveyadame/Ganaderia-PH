-- Catálogo de raciones a nivel organización
CREATE TABLE "RacionCatalogo" (
  "id"             TEXT NOT NULL,
  "organizacionId" TEXT NOT NULL,
  "nombre"         TEXT NOT NULL,
  "descripcion"    TEXT,
  "activo"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RacionCatalogo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RacionCatalogo_organizacionId_nombre_key"
  ON "RacionCatalogo"("organizacionId", "nombre");
CREATE INDEX "RacionCatalogo_organizacionId_activo_idx"
  ON "RacionCatalogo"("organizacionId", "activo");

ALTER TABLE "RacionCatalogo"
  ADD CONSTRAINT "RacionCatalogo_organizacionId_fkey"
  FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enlace opcional desde RacionDefinicion al catálogo
ALTER TABLE "RacionDefinicion" ADD COLUMN "catalogoId" TEXT;

CREATE INDEX "RacionDefinicion_catalogoId_idx" ON "RacionDefinicion"("catalogoId");

ALTER TABLE "RacionDefinicion"
  ADD CONSTRAINT "RacionDefinicion_catalogoId_fkey"
  FOREIGN KEY ("catalogoId") REFERENCES "RacionCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: para cada nombre único de ración, crea un catálogo y enlaza las raciones existentes
INSERT INTO "RacionCatalogo" ("id", "organizacionId", "nombre", "descripcion", "activo", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  gc."organizacionId",
  rd."nombre",
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT rd2."nombre", co."grupoCorralesId"
  FROM "RacionDefinicion" rd2
  JOIN "Corral" co ON co."id" = rd2."corralId"
) rd
JOIN "GrupoCorrales" gc ON gc."id" = rd."grupoCorralesId"
JOIN "Organizacion" c ON c."id" = gc."organizacionId"
ON CONFLICT ("organizacionId", "nombre") DO NOTHING;

UPDATE "RacionDefinicion" rd
SET "catalogoId" = rc."id"
FROM "RacionCatalogo" rc, "Corral" co, "GrupoCorrales" gc
WHERE rd."corralId" = co."id"
  AND co."grupoCorralesId" = gc."id"
  AND rc."organizacionId" = gc."organizacionId"
  AND rc."nombre" = rd."nombre"
  AND rd."catalogoId" IS NULL;
