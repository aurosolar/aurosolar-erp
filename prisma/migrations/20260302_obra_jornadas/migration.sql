-- CreateTable: obra_jornadas
CREATE TABLE "obra_jornadas" (
    "id" TEXT NOT NULL,
    "obra_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" TEXT NOT NULL DEFAULT '08:00',
    "hora_fin" TEXT NOT NULL DEFAULT '17:00',
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obra_jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable: obra_jornada_instaladores
CREATE TABLE "obra_jornada_instaladores" (
    "id" TEXT NOT NULL,
    "jornada_id" TEXT NOT NULL,
    "instalador_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obra_jornada_instaladores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "obra_jornadas_obra_id_idx" ON "obra_jornadas"("obra_id");
CREATE INDEX "obra_jornadas_fecha_idx" ON "obra_jornadas"("fecha");
CREATE INDEX "obra_jornada_instaladores_instalador_id_idx" ON "obra_jornada_instaladores"("instalador_id");
CREATE INDEX "obra_jornada_instaladores_jornada_id_idx" ON "obra_jornada_instaladores"("jornada_id");
CREATE UNIQUE INDEX "obra_jornada_instaladores_jornada_id_instalador_id_key" ON "obra_jornada_instaladores"("jornada_id", "instalador_id");

-- AddForeignKey
ALTER TABLE "obra_jornadas" ADD CONSTRAINT "obra_jornadas_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obra_jornada_instaladores" ADD CONSTRAINT "obra_jornada_instaladores_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "obra_jornadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "obra_jornada_instaladores" ADD CONSTRAINT "obra_jornada_instaladores_instalador_id_fkey" FOREIGN KEY ("instalador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing data: create jornadas from obras with fechaProgramada
INSERT INTO "obra_jornadas" ("id", "obra_id", "fecha", "hora_inicio", "hora_fin", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    o.id,
    o.fecha_programada::date,
    '08:00',
    '17:00',
    NOW(),
    NOW()
FROM "obras" o
WHERE o.fecha_programada IS NOT NULL
  AND o.deleted_at IS NULL
  AND o.estado IN ('PROGRAMADA', 'INSTALANDO', 'VALIDACION_OPERATIVA', 'REVISION_COORDINADOR');

-- Migrate existing instaladores to jornada_instaladores
INSERT INTO "obra_jornada_instaladores" ("id", "jornada_id", "instalador_id", "created_at")
SELECT
    gen_random_uuid(),
    j.id,
    oi.instalador_id,
    NOW()
FROM "obra_jornadas" j
JOIN "obra_instaladores" oi ON oi.obra_id = j.obra_id;
