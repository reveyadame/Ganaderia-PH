-- Agregar nombre a RacionDefinicion (NOT NULL con default vacío para filas existentes)
ALTER TABLE "RacionDefinicion" ADD COLUMN "nombre" TEXT NOT NULL DEFAULT '';

-- Backfill: usar la descripción si existe, o un nombre genérico
UPDATE "RacionDefinicion"
SET "nombre" = COALESCE(NULLIF("descripcion", ''), 'Ración sin nombre')
WHERE "nombre" = '';

-- Quitar el default para forzar que las nuevas raciones especifiquen nombre
ALTER TABLE "RacionDefinicion" ALTER COLUMN "nombre" DROP DEFAULT;
