-- Auditoría de ajustes manuales de inventario
CREATE TABLE "AjusteInventario" (
  "id"               TEXT NOT NULL,
  "medicamentoId"    TEXT NOT NULL,
  "farmaciaId"       TEXT NOT NULL,
  "cantidadAnterior" INTEGER NOT NULL,
  "cantidadNueva"    INTEGER NOT NULL,
  "delta"            INTEGER NOT NULL,
  "costoUnitario"    DECIMAL(10, 2),
  "justificacion"    TEXT NOT NULL,
  "realizadoPorId"   TEXT NOT NULL,
  "fechaAjuste"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AjusteInventario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AjusteInventario_medicamentoId_fechaAjuste_idx"
  ON "AjusteInventario"("medicamentoId", "fechaAjuste");
CREATE INDEX "AjusteInventario_farmaciaId_fechaAjuste_idx"
  ON "AjusteInventario"("farmaciaId", "fechaAjuste");

ALTER TABLE "AjusteInventario"
  ADD CONSTRAINT "AjusteInventario_medicamentoId_fkey"
  FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AjusteInventario"
  ADD CONSTRAINT "AjusteInventario_farmaciaId_fkey"
  FOREIGN KEY ("farmaciaId") REFERENCES "Farmacia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AjusteInventario"
  ADD CONSTRAINT "AjusteInventario_realizadoPorId_fkey"
  FOREIGN KEY ("realizadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
