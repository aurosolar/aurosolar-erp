-- DropForeignKey
ALTER TABLE "documentos" DROP CONSTRAINT "documentos_obra_id_fkey";

-- DropForeignKey
ALTER TABLE "work_events" DROP CONSTRAINT "work_events_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "work_reports" DROP CONSTRAINT "work_reports_empleado_id_fkey";

-- DropForeignKey
ALTER TABLE "work_reports" DROP CONSTRAINT "work_reports_obra_id_fkey";

-- DropForeignKey
ALTER TABLE "work_sessions" DROP CONSTRAINT "work_sessions_empleado_id_fkey";

-- DropForeignKey
ALTER TABLE "work_sessions" DROP CONSTRAINT "work_sessions_obra_id_fkey";

-- DropForeignKey
ALTER TABLE "work_sessions" DROP CONSTRAINT "work_sessions_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "work_shifts" DROP CONSTRAINT "work_shifts_empleado_id_fkey";

-- AlterTable
ALTER TABLE "actividades" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "catalogos" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "config_sistema" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "contactos" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "incidencias" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "obra_jornadas" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "obras" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "tareas_crm" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "tratos" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "empresa_id" TEXT;

-- AlterTable
ALTER TABLE "work_events" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "start_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "work_reports" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "firma_fecha" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "work_sessions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "start_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "session_tipo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "work_shifts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "start_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cif" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "logo_url" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cif_key" ON "empresas"("cif");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogos" ADD CONSTRAINT "catalogos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_sistema" ADD CONSTRAINT "config_sistema_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratos" ADD CONSTRAINT "tratos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_crm" ADD CONSTRAINT "tareas_crm_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_events" ADD CONSTRAINT "work_events_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_documentos_entity" RENAME TO "documentos_entity_type_entity_id_idx";

-- RenameIndex
ALTER INDEX "idx_wevt_shift" RENAME TO "work_events_shift_id_idx";

-- RenameIndex
ALTER INDEX "idx_wr_empleado" RENAME TO "work_reports_empleado_id_idx";

-- RenameIndex
ALTER INDEX "idx_wr_obra" RENAME TO "work_reports_obra_id_idx";

-- RenameIndex
ALTER INDEX "idx_wsess_empleado" RENAME TO "work_sessions_empleado_id_start_time_idx";

-- RenameIndex
ALTER INDEX "idx_wsess_obra" RENAME TO "work_sessions_obra_id_idx";

-- RenameIndex
ALTER INDEX "idx_wsess_shift" RENAME TO "work_sessions_shift_id_idx";

-- RenameIndex
ALTER INDEX "idx_ws_empleado" RENAME TO "work_shifts_empleado_id_start_time_idx";

