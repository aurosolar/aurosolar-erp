-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Gate Engine v2
-- 1) Enum EstadoChecklist + campos review en ChecklistValidacion
-- 2) PlanPago.requiere_para_estado
-- 3) Eliminar TERMINADA del enum EstadoObra
-- ═══════════════════════════════════════════════════════════

-- ── 1. Crear enum EstadoChecklist ──
CREATE TYPE "EstadoChecklist" AS ENUM ('BORRADOR', 'SUBMITIDA', 'APROBADA', 'RECHAZADA');

-- ── 2. Añadir columnas de review a checklist_validaciones ──
ALTER TABLE "checklist_validaciones"
  ADD COLUMN "status" "EstadoChecklist" NOT NULL DEFAULT 'BORRADOR',
  ADD COLUMN "submitted_at" TIMESTAMPTZ,
  ADD COLUMN "submitted_by_id" UUID,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ,
  ADD COLUMN "reviewed_by_id" UUID,
  ADD COLUMN "review_decision" TEXT,
  ADD COLUMN "review_notes" TEXT;

ALTER TABLE "checklist_validaciones"
  ADD CONSTRAINT "checklist_validaciones_submitted_by_id_fkey"
    FOREIGN KEY ("submitted_by_id") REFERENCES "usuarios"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "checklist_validaciones_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;

-- ── 3. Backfill: resultado != BORRADOR → status = SUBMITIDA ──
UPDATE "checklist_validaciones"
SET
  "status" = 'SUBMITIDA',
  "submitted_at" = "created_at",
  "submitted_by_id" = "creado_por_id"
WHERE "resultado" != 'BORRADOR';

-- ── 4. Index compuesto ──
CREATE INDEX "idx_checklist_obra_status" ON "checklist_validaciones"("obra_id", "status");

-- ── 5. PlanPago: hitos vinculados a estados ──
ALTER TABLE "plan_pagos"
  ADD COLUMN "requiere_para_estado" TEXT;

-- ── 6. Eliminar TERMINADA ──
UPDATE "obras" SET "estado" = 'LEGALIZACION' WHERE "estado" = 'TERMINADA';

ALTER TYPE "EstadoObra" RENAME TO "EstadoObra_old";
CREATE TYPE "EstadoObra" AS ENUM (
  'REVISION_TECNICA', 'PREPARANDO', 'PENDIENTE_MATERIAL', 'PROGRAMADA',
  'INSTALANDO', 'VALIDACION_OPERATIVA', 'REVISION_COORDINADOR',
  'LEGALIZACION', 'LEGALIZADA', 'COMPLETADA', 'CANCELADA'
);
ALTER TABLE "obras"
  ALTER COLUMN "estado" TYPE "EstadoObra" USING "estado"::text::"EstadoObra";
DROP TYPE "EstadoObra_old";
