-- Consolidate ADMIN role into DIRECTOR
--
-- Steps:
--   1. Grant ALL activities to existing ADMIN users (they bypassed activity checks before).
--   2. Migrate Usuario.tipo from ADMIN to DIRECTOR.
--   3. Drop ADMIN from the TipoUsuario enum.

-- Step 1: Grant every activity to current ADMIN users (idempotent)
INSERT INTO "UsuarioActividad" ("id", "usuarioId", "actividad")
SELECT
  gen_random_uuid()::text,
  u."id",
  a."actividad"
FROM "Usuario" u
CROSS JOIN unnest(enum_range(NULL::"ActividadUsuario")) AS a("actividad")
WHERE u."tipo" = 'ADMIN'
ON CONFLICT ("usuarioId", "actividad") DO NOTHING;

-- Step 2: Reassign ADMIN users to DIRECTOR
UPDATE "Usuario" SET "tipo" = 'DIRECTOR' WHERE "tipo" = 'ADMIN';

-- Step 3: Recreate the enum without ADMIN
ALTER TYPE "TipoUsuario" RENAME TO "TipoUsuario_old";
CREATE TYPE "TipoUsuario" AS ENUM ('SUPERUSUARIO', 'DIRECTOR', 'OPERADOR');
ALTER TABLE "Usuario"
  ALTER COLUMN "tipo" TYPE "TipoUsuario"
  USING "tipo"::text::"TipoUsuario";
DROP TYPE "TipoUsuario_old";
