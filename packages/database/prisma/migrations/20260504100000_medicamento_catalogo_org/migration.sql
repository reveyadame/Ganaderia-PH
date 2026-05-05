-- DEC-023: Medicamento se vuelve catálogo de organización.
-- El stock y costo se manejan por farmacia vía UnidadMedicamento (que ya tiene farmaciaId).
-- En dev: tabla puede estar vacía o ser reseteada con `prisma migrate reset`.

-- Drop FK + index del antiguo farmaciaId
ALTER TABLE "Medicamento" DROP CONSTRAINT "Medicamento_farmaciaId_fkey";
DROP INDEX "Medicamento_farmaciaId_activo_idx";

-- Reemplazar la columna farmaciaId por organizacionId
ALTER TABLE "Medicamento" DROP COLUMN "farmaciaId";
ALTER TABLE "Medicamento" ADD COLUMN "organizacionId" TEXT NOT NULL;

-- FK + restricciones nuevas
ALTER TABLE "Medicamento"
  ADD CONSTRAINT "Medicamento_organizacionId_fkey"
  FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Medicamento_organizacionId_nombre_key"
  ON "Medicamento"("organizacionId", "nombre");

CREATE INDEX "Medicamento_organizacionId_activo_idx"
  ON "Medicamento"("organizacionId", "activo");
