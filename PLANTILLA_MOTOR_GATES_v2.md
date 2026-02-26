# MOTOR DE GATES v2 — IMPLEMENTACIÓN REVISADA
## Plantilla Obligatoria · Auro Solar ERP

---

## 1) RESUMEN EJECUTIVO

**Qué se implementa:**

1. Eliminar estado `TERMINADA` del enum. Flujo pasa a ser `REVISION_COORDINADOR → LEGALIZACION` directo.
2. Añadir workflow de revisión a `ChecklistValidacion`: nuevo campo `status` con ciclo `BORRADOR → SUBMITIDA → APROBADA|RECHAZADA`, con campos de submit y review (quién, cuándo, decisión, notas).
3. Nuevo enum `EstadoChecklist` (`BORRADOR`, `SUBMITIDA`, `APROBADA`, `RECHAZADA`).
4. Añadir campo `requiereParaEstado` a `PlanPago` para vincular hitos de pago a estados concretos (pagos por hito, no porcentaje fijo).
5. Motor `gate-engine.ts` con `evaluateTransition()` / `executeTransition()`.
6. Rediseño del gate `PROGRAMADA→INSTALANDO`: el check-in ES el trigger que llama a `evaluateTransition()` internamente — no es un prerrequisito circular.
7. Endpoint de pre-evaluación, refactorización del PATCH, componentes `GateBlocker` y `OverrideModal`.

**Qué queda fuera:** OCR/firmas (se mencionan como campos futuros pero no se implementa la lógica de procesamiento). Tests E2E automatizados. Notificaciones email/push.

---

## 2) DECISIONES / ASUNCIONES

- **D1**: `TERMINADA` se elimina del enum `EstadoObra`. El flujo es: `REVISION_COORDINADOR → LEGALIZACION → LEGALIZADA → COMPLETADA`. No queda estado intermedio ambiguo.
- **D2**: El campo `resultado` de `ChecklistValidacion` (OK / OK_CON_OBS / NO_OK) se mantiene y lo rellena el instalador al submitir. El nuevo campo `status` (BORRADOR / SUBMITIDA / APROBADA / RECHAZADA) controla el ciclo de revisión. Son dos cosas distintas: `resultado` = "¿pasó la validación técnica?", `status` = "¿dónde está en el flujo de revisión?".
- **D3**: El gate para `REVISION_COORDINADOR → LEGALIZACION` usa **pagos por hito**, no porcentaje fijo. Se valida que todos los `PlanPago` con `requiereParaEstado = 'LEGALIZACION'` estén pagados (campo `pagado = true`).
- **D4**: `PlanPago` recibe campo nuevo `requiereParaEstado` (nullable). Ejemplo: un hito "Anticipo 50%" con `requiereParaEstado = 'LEGALIZACION'` bloquea el paso a LEGALIZACION si no está pagado. Si no hay hitos con ese campo, el gate se salta (no bloquea).
- **D5**: `PROGRAMADA → INSTALANDO` no tiene gate "existe check-in". En su lugar, el endpoint de check-in (`POST /api/campo/checkin`) internamente llama a `evaluateTransition(obra, 'PROGRAMADA', 'INSTALANDO')` y, si pasa, mueve el estado. Los gates de esa transición son: fecha ±tolerancia + instalador sin jornada activa en otra obra. El check-in crea el registro de jornada Y transiciona en la misma operación.
- **D6**: `TOLERANCIA_DIAS = 1` (configurable).
- **D7**: Para `REVISION_COORDINADOR → INSTALANDO` (rechazo), el coordinador debe cambiar el `status` de la checklist a `RECHAZADA` con notas de revisión. El gate exige `status = RECHAZADA` y `reviewNotes` no vacío.
- **D8**: Docs mínimos para `REVISION_COORDINADOR → LEGALIZACION`: al menos 1 documento tipo `PRESUPUESTO` o `CONTRATO`. Se usa el enum `TipoDocumento` que ya existe en Prisma.
- **D9**: `ChecklistValidacion` admite un solo registro activo por obra (el más reciente). Si se rechaza, el instalador edita el mismo o crea uno nuevo — pero siempre se evalúa el último.
- **D10**: La migración incluye backfill: todas las `ChecklistValidacion` existentes con `resultado != BORRADOR` se marcan como `status = SUBMITIDA`. Las que tienen `resultado = BORRADOR` quedan en `status = BORRADOR`.

### Preguntas bloqueantes: NINGUNA
(Los 5 cambios solicitados están claros. Las asunciones D1-D10 cubren los detalles de implementación.)

---

## 3) MODELO DE DATOS

### 3.1 Entidades nuevas

**Ninguna.** Solo se modifica `ChecklistValidacion` y `PlanPago`.

### 3.2 Cambios en entidades existentes

#### A) Enum `EstadoObra` — ELIMINAR `TERMINADA`

```diff
 enum EstadoObra {
   REVISION_TECNICA
   PREPARANDO
   PENDIENTE_MATERIAL
   PROGRAMADA
   INSTALANDO
   VALIDACION_OPERATIVA
   REVISION_COORDINADOR
-  TERMINADA
   LEGALIZACION
   LEGALIZADA
   COMPLETADA
   CANCELADA
 }
```

**Justificación:** `TERMINADA` era ambiguo ("¿terminada la instalación o todo el proyecto?"). El flujo ahora es `REVISION_COORDINADOR → LEGALIZACION` directo tras aprobación del coordinador.

#### B) Nuevo enum `EstadoChecklist`

```prisma
enum EstadoChecklist {
  BORRADOR       // Instalador está rellenando
  SUBMITIDA      // Instalador envió. Pendiente revisión oficina
  APROBADA       // Coordinador aprobó
  RECHAZADA      // Coordinador rechazó. Instalador debe corregir
}
```

#### C) `ChecklistValidacion` — Campos nuevos

| Campo | Tipo | Obligatorio | Default | Index | Motivo |
|-------|------|-------------|---------|-------|--------|
| `status` | `EstadoChecklist` | Sí | `BORRADOR` | Sí (obraId + status) | Ciclo de revisión campo/oficina |
| `submittedAt` | `DateTime?` | No | null | No | Cuándo envió el instalador |
| `submittedById` | `String?` (FK→Usuario) | No | null | No | Quién envió (instalador) |
| `reviewedAt` | `DateTime?` | No | null | No | Cuándo revisó el coordinador |
| `reviewedById` | `String?` (FK→Usuario) | No | null | No | Quién revisó |
| `reviewDecision` | `String?` | No | null | No | `APROBADA` o `RECHAZADA` (redundante con status pero explícito para auditoría) |
| `reviewNotes` | `String?` | No | null | No | Notas del coordinador (obligatorias en rechazo) |

```prisma
model ChecklistValidacion {
  // ... campos existentes ...
  status          EstadoChecklist  @default(BORRADOR)
  submittedAt     DateTime?        @map("submitted_at")
  submittedById   String?          @map("submitted_by_id")
  reviewedAt      DateTime?        @map("reviewed_at")
  reviewedById    String?          @map("reviewed_by_id")
  reviewDecision  String?          @map("review_decision")
  reviewNotes     String?          @map("review_notes")

  submittedBy     Usuario?         @relation("ChecklistSubmitter", fields: [submittedById], references: [id])
  reviewedBy      Usuario?         @relation("ChecklistReviewer", fields: [reviewedById], references: [id])
}
```

#### D) `PlanPago` — Campo nuevo

| Campo | Tipo | Obligatorio | Default | Index | Motivo |
|-------|------|-------------|---------|-------|--------|
| `requiereParaEstado` | `String?` | No | null | No | Si no es null, el hito debe estar pagado para que la obra transite a ese estado |

```prisma
model PlanPago {
  // ... campos existentes ...
  requiereParaEstado  String?  @map("requiere_para_estado")
  // Ejemplo valores: "LEGALIZACION", "COMPLETADA", null
}
```

#### E) `Usuario` — Relaciones nuevas

```prisma
model Usuario {
  // ... relaciones existentes ...
  checklistSubmitidos  ChecklistValidacion[]  @relation("ChecklistSubmitter")
  checklistRevisados   ChecklistValidacion[]  @relation("ChecklistReviewer")
}
```

### 3.3 Relaciones y constraints

- `ChecklistValidacion.submittedById` → `Usuario.id` (opcional, FK).
- `ChecklistValidacion.reviewedById` → `Usuario.id` (opcional, FK).
- `PlanPago.requiereParaEstado` es string libre (no FK), validado por código contra estados válidos.
- No se añade unique en `ChecklistValidacion(obraId)` porque puede haber historial. El motor siempre toma `orderBy: { createdAt: 'desc' }, take: 1`.

### 3.4 Migraciones

**Migración 1: `add_checklist_review_workflow`**

```sql
-- 1. Crear enum
CREATE TYPE "EstadoChecklist" AS ENUM ('BORRADOR', 'SUBMITIDA', 'APROBADA', 'RECHAZADA');

-- 2. Añadir columnas a checklist_validaciones
ALTER TABLE "checklist_validaciones"
  ADD COLUMN "status" "EstadoChecklist" NOT NULL DEFAULT 'BORRADOR',
  ADD COLUMN "submitted_at" TIMESTAMP,
  ADD COLUMN "submitted_by_id" UUID REFERENCES "usuarios"("id"),
  ADD COLUMN "reviewed_at" TIMESTAMP,
  ADD COLUMN "reviewed_by_id" UUID REFERENCES "usuarios"("id"),
  ADD COLUMN "review_decision" TEXT,
  ADD COLUMN "review_notes" TEXT;

-- 3. Backfill: registros con resultado != BORRADOR → status = SUBMITIDA
UPDATE "checklist_validaciones"
  SET "status" = 'SUBMITIDA',
      "submitted_at" = "created_at",
      "submitted_by_id" = "creado_por_id"
  WHERE "resultado" != 'BORRADOR';

-- 4. Index
CREATE INDEX "idx_checklist_obra_status" ON "checklist_validaciones"("obra_id", "status");
```

**Migración 2: `add_plan_pago_requiere_estado`**

```sql
ALTER TABLE "plan_pagos"
  ADD COLUMN "requiere_para_estado" TEXT;
```

**Migración 3: `remove_terminada_state`**

```sql
-- Mover obras en TERMINADA → LEGALIZACION (backfill)
UPDATE "obras" SET "estado" = 'LEGALIZACION' WHERE "estado" = 'TERMINADA';

-- Eliminar valor del enum
ALTER TYPE "EstadoObra" RENAME TO "EstadoObra_old";
CREATE TYPE "EstadoObra" AS ENUM (
  'REVISION_TECNICA', 'PREPARANDO', 'PENDIENTE_MATERIAL', 'PROGRAMADA',
  'INSTALANDO', 'VALIDACION_OPERATIVA', 'REVISION_COORDINADOR',
  'LEGALIZACION', 'LEGALIZADA', 'COMPLETADA', 'CANCELADA'
);
ALTER TABLE "obras" ALTER COLUMN "estado" TYPE "EstadoObra" USING "estado"::text::"EstadoObra";
DROP TYPE "EstadoObra_old";
```

**Orden de ejecución:** 1 → 2 → 3 (3 depende de que no haya obras en TERMINADA).

---

## 4) REGLAS DE NEGOCIO / VALIDACIONES (GATES)

### 4.0 Flujo de estados oficial (post-cambio)

```
REVISION_TECNICA → PREPARANDO → PENDIENTE_MATERIAL → PROGRAMADA →
INSTALANDO → VALIDACION_OPERATIVA → REVISION_COORDINADOR →
LEGALIZACION → LEGALIZADA → COMPLETADA
                                                    ↗ (rechazo: → INSTALANDO)
```

### 4.1 Matriz de transiciones (ACTUALIZADA — sin TERMINADA)

| Desde ↓ \ Hacia → | REV_TEC | PREP | PTE_MAT | PROG | INST | VAL_OP | REV_COORD | LEGAL | LEGALIZ | COMPL | CANCEL |
|--------------------|---------|------|---------|------|------|--------|-----------|-------|---------|-------|--------|
| **REVISION_TECNICA** | — | ✅ | — | — | — | — | — | — | — | — | ✅ |
| **PREPARANDO** | — | — | ✅ | ✅ | — | — | — | — | — | — | ✅ |
| **PENDIENTE_MATERIAL** | — | ✅ | — | ✅ | — | — | — | — | — | — | ✅ |
| **PROGRAMADA** | — | ✅ | — | — | ✅¹ | — | — | — | — | — | ✅ |
| **INSTALANDO** | — | — | — | — | — | ✅ | — | — | — | — | ✅ |
| **VALIDACION_OPERATIVA** | — | — | — | — | ✅² | — | ✅ | — | — | — | — |
| **REVISION_COORDINADOR** | — | — | — | — | ✅³ | — | — | ✅ | — | — | — |
| **LEGALIZACION** | — | — | — | — | — | — | — | — | ✅ | — | — |
| **LEGALIZADA** | — | — | — | — | — | — | — | — | — | ✅ | — |
| **COMPLETADA** | — | — | — | — | — | — | — | — | — | — | — |
| **CANCELADA** | ✅ | — | — | — | — | — | — | — | — | — | — |

> ¹ Triggered por check-in (no manual desde oficina salvo override).
> ² Devolución si validación incompleta (el instalador vuelve a trabajar).
> ³ Rechazo del coordinador (requiere checklist status = RECHAZADA + notas).

### 4.2 Gate global: Incidencias críticas

| Condición | Aplica a | Mensaje | Acción |
|-----------|----------|---------|--------|
| `tieneIncidenciaCritica === true` | Todas excepto →CANCELADA y →INSTALANDO | "Hay {n} incidencia(s) CRÍTICA(s) sin resolver" | NAVIGATE → /obras/{id}?tab=incidencias |

### 4.3 Gates por transición

---

#### REVISION_TECNICA → PREPARANDO

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `CLIENTE_ASIGNADO` | `clienteId !== null` | "La obra debe tener un cliente asignado" | EDIT_FIELD clienteId | ✅ |
| `PRESUPUESTO` | `presupuestoTotal > 0` | "Se requiere presupuesto total" | EDIT_FIELD presupuestoTotal | ✅ |

---

#### PREPARANDO → PROGRAMADA

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `FECHA_PROGRAMADA` | `fechaProgramada !== null` | "Se debe asignar fecha de instalación" | NAVIGATE → /planificacion | ✅ |
| `INSTALADORES_ASIGNADOS` | `instaladores.length > 0` | "Se deben asignar instaladores" | NAVIGATE → /planificacion | ✅ |
| `DIRECCION_INSTALACION` | `direccionInstalacion !== null` | "Se requiere dirección de instalación" | EDIT_FIELD direccionInstalacion | ✅ |

---

#### PREPARANDO → PENDIENTE_MATERIAL

Sin gates obligatorios. Estado informativo.

---

#### PENDIENTE_MATERIAL → PROGRAMADA

Mismos gates que PREPARANDO → PROGRAMADA (fecha + instaladores + dirección).

---

#### PROGRAMADA → INSTALANDO ⚠️ REDISEÑADO

**Este gate NO se invoca desde el botón de cambio de estado del dashboard.** Se invoca internamente desde `POST /api/campo/checkin`.

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `FECHA_TOLERANCIA` | `\|fechaProgramada - hoy\| <= TOLERANCIA_DIAS` | "Obra programada para {fecha}, no para hoy (±{n} días tolerancia)" | INFO | ✅ |
| `INSTALADOR_SIN_JORNADA_OTRA_OBRA` | `No existe checkin abierto (sin horaSalida) del instalador que hace check-in en OTRA obra` | "{nombre} tiene jornada activa en obra {codigo}" | NAVIGATE → /campo/checkin | ✅ |

**Flujo del check-in:**

```
1. Instalador pulsa "Check-in" en su app de campo para obra X
2. POST /api/campo/checkin { obraId: X }
3. Backend:
   a. Si obra.estado === 'PROGRAMADA':
      - Llama evaluateTransition(obra, 'PROGRAMADA', 'INSTALANDO', userId)
      - Si allowed:
        → Crea checkin + Mueve a INSTALANDO + Registra actividad
      - Si !allowed:
        → Devuelve 422 con reasons[] y actions[] (NO crea checkin)
   b. Si obra.estado === 'INSTALANDO':
      - Solo crea checkin (la obra ya está en el estado correcto)
   c. Si obra.estado es otro:
      - Error: "No se puede hacer check-in en obra con estado {estado}"
```

**¿Y desde dashboard?** Un coordinador puede mover PROGRAMADA→INSTALANDO manualmente vía override (por si el instalador no tiene móvil), pero se registra como override con motivo obligatorio.

---

#### INSTALANDO → VALIDACION_OPERATIVA

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `JORNADA_CERRADA` | `No hay checkin abierto (sin horaSalida) en esta obra` | "Hay jornada activa sin cerrar" | NAVIGATE → /campo/checkin | ✅ |
| `FOTOS_MINIMAS` | `documentos WHERE tipo IN (FOTO_INSTALACION, FOTO_INVERSOR, FOTO_PANELES, FOTO_CUADRO, FOTO_GENERAL) >= 2` | "Se necesitan al menos 2 fotos de la instalación" | NAVIGATE → /campo/validar | ✅ |

> Nota: Este estado permite al instalador **entrar a validar** (crear borrador de checklist). El gate no exige checklist submitido — eso es para la siguiente transición.

---

#### VALIDACION_OPERATIVA → REVISION_COORDINADOR

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `CHECKLIST_SUBMITIDA` | `Última checklistValidacion.status === 'SUBMITIDA'` | "Debe enviar el checklist de validación (actualmente en borrador)" | NAVIGATE → /campo/validar-avanzado?obra={id} | ✅ |
| `SERIAL_INVERSOR` | `checklistValidacion.serialInversor !== null` | "Se requiere serial del inversor" | NAVIGATE → /campo/validar-avanzado?obra={id} | ✅ |
| `ITEMS_CRITICOS_OK` | `Ningún ítem crítico tiene respuesta 'NO'` | "{n} ítem(s) crítico(s) fallido(s)" | NAVIGATE → /campo/validar-avanzado?obra={id} | ✅ |

> Importante: El campo `resultado` (OK/OK_CON_OBS/NO_OK) lo calcula el instalador al submitir. Si hay ítems críticos en NO, resultado = NO_OK y el gate `ITEMS_CRITICOS_OK` falla. El instalador debe corregir antes de submitir.

---

#### REVISION_COORDINADOR → LEGALIZACION ⚠️ REDISEÑADO (ex TERMINADA)

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `CHECKLIST_APROBADA` | `Última checklistValidacion.status === 'APROBADA'` | "La validación debe ser aprobada por el coordinador" | NAVIGATE → /obras/{id}?tab=validacion | ✅ |
| `HITOS_PAGO_CUMPLIDOS` | `Todos los PlanPago con requiereParaEstado = 'LEGALIZACION' tienen pagado = true` | "Hitos de pago pendientes para legalizar: {lista conceptos}" | NAVIGATE → /obras/{id}?tab=pagos | ✅ |
| `DOCS_MINIMOS` | `Al menos 1 doc tipo PRESUPUESTO o CONTRATO` | "Falta documentación: presupuesto o contrato" | NAVIGATE → /obras/{id}?tab=documentos | ✅ |
| `ACTIVOS_REGISTRADOS` | `activos.length > 0 (al menos inversor)` | "Registre los activos instalados" | NAVIGATE → /obras/{id}?tab=activos | ✅ |

---

#### REVISION_COORDINADOR → INSTALANDO (rechazo)

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `CHECKLIST_RECHAZADA` | `Última checklistValidacion.status === 'RECHAZADA'` | "Debe rechazar la validación antes de devolver a campo" | NAVIGATE → /obras/{id}?tab=validacion | NO |
| `REVIEW_NOTES` | `checklistValidacion.reviewNotes && reviewNotes.length >= 10` | "Indique el motivo del rechazo (mín. 10 caracteres)" | INPUT reviewNotes | NO |

> El coordinador NO puede devolver a INSTALANDO sin haber rechazado explícitamente la checklist con motivo. Esto fuerza el ciclo: rechazar checklist → mover estado → instalador corrige → re-submitir.

---

#### VALIDACION_OPERATIVA → INSTALANDO (auto-corrección)

Sin gates. El instalador puede volver a INSTALANDO si se da cuenta de que necesita corregir algo antes de submitir.

---

#### LEGALIZACION → LEGALIZADA

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `SIN_INCIDENCIAS_CRITICAS` | (gate global) | — | — | ✅ |
| `EXPEDIENTE_O_ESTADO_LEGAL` | `expedienteLegal !== null OR estadoLegalizacion in ['APROBADA','INSCRITA']` | "Falta nº expediente o estado legalización avanzado" | EDIT_FIELD expedienteLegal | ✅ |

---

#### LEGALIZADA → COMPLETADA

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `SIN_INCIDENCIAS_CRITICAS` | (gate global) | — | — | ✅ |
| `HITOS_COMPLETADA` | `Todos los PlanPago con requiereParaEstado = 'COMPLETADA' tienen pagado = true` | "Hitos de pago pendientes: {lista}" | NAVIGATE → /obras/{id}?tab=pagos | ✅ |
| `COBRO_TOTAL` | `totalPagado >= presupuestoTotal` | "Pendiente: {importe}€ (cobrado {n}%)" | NAVIGATE → /obras/{id}?tab=pagos | ✅ |

---

#### → CANCELADA

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `MOTIVO_CANCELACION` | `nota && nota.length >= 10` | "Motivo de cancelación obligatorio (mín. 10 caracteres)" | INPUT nota | NO |

---

#### CANCELADA → REVISION_TECNICA

| Gate ID | Condición | Mensaje | Acción | Override? |
|---------|-----------|---------|--------|-----------|
| `ROL_OVERRIDE` | `rol in ['ADMIN','JEFE_INSTALACIONES']` | "Solo Admin o Jefe Instalaciones puede reabrir" | — | NO |
| `MOTIVO_REAPERTURA` | `nota && nota.length >= 10` | "Motivo de reapertura obligatorio" | INPUT nota | NO |

---

### 4.4 Ciclo de vida del ChecklistValidacion

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  INSTALADOR (campo)              COORDINADOR (oficina)           │
│                                                                  │
│  ① Crea checklist ──→ BORRADOR                                  │
│     - Rellena ítems, fotos, seriales, OCR, firmas               │
│     - Puede guardar parcial (sigue BORRADOR)                    │
│                                                                  │
│  ② Pulsa "Enviar" ──→ SUBMITIDA                                 │
│     - Se calcula resultado (OK/OK_CON_OBS/NO_OK)                │
│     - Se registra submittedAt + submittedById                   │
│     - Si items críticos en NO → resultado = NO_OK               │
│     - NO auto-transiciona el estado de la obra                  │
│                                                                  │
│                              ③ Revisa ──→ APROBADA               │
│                                 - reviewedAt/By/Decision/Notes   │
│                                 - Habilita REV_COORD→LEGALIZAC   │
│                                                                  │
│                              ③' Rechaza ──→ RECHAZADA            │
│                                 - reviewNotes obligatorias       │
│                                 - Habilita REV_COORD→INSTALANDO  │
│                                                                  │
│  ④ Corrige (si rechazado)                                       │
│     - Edita el checklist existente                              │
│     - Vuelve a BORRADOR → repite ciclo                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.5 Casos límite

| Caso | Comportamiento |
|------|---------------|
| Obra en VALIDACION_OPERATIVA, instalador submitió checklist con NO_OK | El gate `ITEMS_CRITICOS_OK` bloquea paso a REVISION_COORDINADOR. Instalador debe corregir y re-submitir |
| Coordinador aprueba checklist pero faltan hitos de pago | Checklist queda APROBADA, pero gate `HITOS_PAGO_CUMPLIDOS` bloquea paso a LEGALIZACION. Administración cobra primero |
| No existen PlanPago con `requiereParaEstado = 'LEGALIZACION'` | Gate `HITOS_PAGO_CUMPLIDOS` se salta (pasa). Solo se valida si hay hitos vinculados |
| Obra en PROGRAMADA, coordinador quiere mover a INSTALANDO desde dashboard | Solo vía override (motivo obligatorio). En operativa normal, el check-in del instalador es el trigger |
| Dos instaladores asignados, uno con jornada abierta en otra obra | Gate `INSTALADOR_SIN_JORNADA` falla solo para el instalador específico que hace check-in. El otro puede hacer check-in sin problema |
| Check-in en obra ya en INSTALANDO | Se crea checkin normalmente, sin intentar transición (ya está en INSTALANDO) |
| Race condition en cambio de estado | `evaluateTransition` verifica `from === obra.estado` en BD. Si no coincide → 409 "Estado ha cambiado, recargue" |

---

## 5) API / ENDPOINTS

### 5.1 Endpoints nuevos

| Método | Ruta | Auth/Rol | Input | Output | Errores |
|--------|------|----------|-------|--------|---------|
| GET | `/api/obras/[id]/evaluate-transition?to={ESTADO}` | `obras:ver` | Query: `to` | `{ ok, data: TransitionResult }` | 400, 404, 409 |
| PATCH | `/api/obras/[id]/checklist/[checklistId]/submit` | `campo:validar` | `{}` | `{ ok, data: checklist }` | 400: no es borrador, 422: ítems incompletos |
| PATCH | `/api/obras/[id]/checklist/[checklistId]/review` | `obras:cambiarEstado` | `{ decision: 'APROBADA'\|'RECHAZADA', notes?: string }` | `{ ok, data: checklist }` | 400, 422: notas requeridas en rechazo |

### 5.2 Endpoints modificados

| Método | Ruta | Cambio |
|--------|------|--------|
| PATCH | `/api/obras/[id]` | Delega a `executeTransition()`, devuelve `TransitionResult` en 422 |
| POST | `/api/campo/checkin` | Si `obra.estado === 'PROGRAMADA'` → llama `evaluateTransition()` antes de crear checkin |
| GET | `/api/obras/[id]` | Añade `checklistStatus` y `gatesPorTransicion` al response |

### 5.3 Detalle del nuevo flujo de check-in

```
POST /api/campo/checkin { obraId }

Si obra.estado === 'PROGRAMADA':
  → evaluateTransition(obra, PROGRAMADA, INSTALANDO, user)
  → Si allowed:
       Crear checkin + Update obra.estado = INSTALANDO + Actividad
       Return 201 { checkin, transicion: { from: PROGRAMADA, to: INSTALANDO } }
  → Si !allowed:
       Return 422 { error: "No se puede iniciar obra", data: TransitionResult }
       (NO se crea checkin)

Si obra.estado === 'INSTALANDO':
  → Crear checkin normalmente
  → Return 201 { checkin }

Si obra.estado es otro:
  → Return 400 { error: "No se puede hacer check-in en estado {estado}" }
```

---

## 6) UX / UI

### 6.1 Pantallas/Componentes

| Componente | Propósito | Estado |
|------------|----------|--------|
| `ObraDetalle.tsx` | Añadir pre-evaluación + GateBlocker + OverrideModal | Modificar |
| `GateBlocker.tsx` | Cards de gates fallidos con botones de acción | Nuevo |
| `OverrideModal.tsx` | Modal override con motivo obligatorio + resumen gates | Nuevo |
| `ChecklistReview.tsx` | Panel para coordinador: aprobar/rechazar checklist con notas | Nuevo |
| `/campo/validar-avanzado/page.tsx` | Ajustar: separar "guardar borrador" de "enviar para revisión" | Modificar |
| `/campo/checkin` flujo | Mostrar gates fallidos si check-in rechazado | Modificar |

### 6.2 Flujo de usuario: Validación campo → oficina

**Instalador en campo:**
1. Obra en INSTALANDO → termina trabajo → cierra jornada.
2. Obra pasa a VALIDACION_OPERATIVA (via gate o manual).
3. Abre "Validar" → rellena checklist: ítems, fotos, seriales, observaciones.
4. Puede pulsar "💾 Guardar borrador" → se guarda con `status = BORRADOR`.
5. Cuando completo, pulsa "📤 Enviar para revisión" → backend calcula resultado, marca `status = SUBMITIDA`.
6. Ve confirmación: "Enviado. Pendiente de aprobación por coordinador."

**Coordinador en oficina:**
1. Ve obra en REVISION_COORDINADOR → abre tab "Validación".
2. Ve el checklist submitido: ítems, fotos, seriales, resultado calculado.
3. Opción A: "✅ Aprobar" → `status = APROBADA` → puede mover a LEGALIZACION.
4. Opción B: "❌ Rechazar" → se abre textarea de notas (obligatorio) → `status = RECHAZADA` → puede mover a INSTALANDO (devolver a campo).

**Instalador recibe rechazo:**
1. Notificación: "Validación rechazada. Motivo: {notas}".
2. Abre checklist → edita campos necesarios → re-submitir.
3. Ciclo se repite.

### 6.3 Microcopy

| Situación | Mensaje |
|-----------|---------|
| Check-in rechazado por fecha | "⚠️ Esta obra está programada para el 15/03, hoy es 18/03. Contacta con coordinación para reprogramar." |
| Check-in rechazado por jornada | "⚠️ Tienes una jornada abierta en la obra A-2025-01-042. Ciérrala antes de iniciar esta." → [Ir a cerrar jornada →] |
| Checklist en borrador, intenta submitir | Si ítems vacíos: "Completa todos los ítems críticos antes de enviar." |
| Coordinador intenta aprobar con ítems críticos NO | "Hay {n} ítems críticos fallidos. ¿Aprobar igualmente?" (override implícito con confirmación) |
| Hitos pendientes para LEGALIZACION | "⚠️ Hitos de pago pendientes: Anticipo 50% (5.000€), Fin obra 40% (4.000€)." → [Ir a cobros →] |
| Override confirmado | "✅ Estado cambiado (override). Motivo registrado en auditoría." |
| Rechazo sin notas | "Indica el motivo del rechazo (mínimo 10 caracteres)." |

### 6.4 Accesibilidad y móvil

- Check-in: botón único grande (min-height 56px), feedback inmediato si gate falla.
- Checklist en campo: "Guardar borrador" vs "Enviar" claramente diferenciados (borrador = gris outline, enviar = naranja sólido).
- Panel de revisión coordinador: botones Aprobar/Rechazar grandes, textarea de notas con autofocus en rechazo.
- GateBlocker: cards apiladas, botones de acción tocables (min 44px), scroll si hay muchos gates.

---

## 7) SEGURIDAD Y SESIONES

### 7.1 Roles y permisos

| Acción | Permiso | Roles |
|--------|---------|-------|
| Evaluar transición (GET) | `obras:ver` | Todos con acceso a obras |
| Ejecutar transición (PATCH) | `obras:cambiarEstado` | ADMIN, DIRECCION, JEFE_INSTALACIONES, ADMINISTRACION |
| Override | `obras:override` | ADMIN, JEFE_INSTALACIONES |
| Submitir checklist | `campo:validar` | INSTALADOR, JEFE_INSTALACIONES |
| Revisar checklist (aprobar/rechazar) | `obras:cambiarEstado` | ADMIN, DIRECCION, JEFE_INSTALACIONES |
| Check-in (que triggerea PROGRAMADA→INSTALANDO) | `campo:checkin` | INSTALADOR, JEFE_INSTALACIONES |

### 7.2 Validación

- Zod en todos los endpoints (ya existe, se extiende para submit/review).
- `nota` y `reviewNotes` truncados a 500 chars, strip HTML.
- `decision` validado como enum `['APROBADA','RECHAZADA']`.
- `requiereParaEstado` validado contra lista de estados válidos al crear PlanPago.

### 7.3 Auditoría

| Evento | Acción | Detalle JSON |
|--------|--------|-------------|
| Transición exitosa | `ESTADO_CAMBIADO` | `{ estadoAnterior, nuevoEstado, nota, gates }` |
| Override | `OVERRIDE_ESTADO` | `{ estadoAnterior, nuevoEstado, motivo, gatesFallidos }` |
| Intento rechazado | `TRANSICION_RECHAZADA` | `{ estadoActual, estadoIntentado, reasons }` |
| Checklist submitida | `CHECKLIST_SUBMITIDA` | `{ checklistId, resultado, serialInversor }` |
| Checklist aprobada | `CHECKLIST_APROBADA` | `{ checklistId, reviewedBy, notes }` |
| Checklist rechazada | `CHECKLIST_RECHAZADA` | `{ checklistId, reviewedBy, notes, motivo }` |

---

## 8) NOTIFICACIONES / EVENTOS

| Evento | Destinatarios | Severidad | Mensaje |
|--------|--------------|-----------|---------|
| Checklist submitida | JEFE_INSTALACIONES, DIRECCION | INFO | "Validación enviada en obra {codigo}" |
| Checklist aprobada | Instalador creador | INFO | "✅ Validación aprobada en {codigo}" |
| Checklist rechazada | Instalador creador | WARNING | "❌ Validación rechazada en {codigo}: {motivo}" |
| Override realizado | ADMIN, DIRECCION | CRITICAL | "⚠️ Override en {codigo} por {usuario}" |
| Estado cambiado | Comercial + instaladores asignados | INFO | (ya existe via `notificarCambioEstadoObra`) |

Se usa el servicio `notificaciones.service.ts` existente. Sin cola ni outbox.

---

## 9) PLAN DE IMPLEMENTACIÓN

| # | Paso | Tiempo | Riesgo |
|---|------|--------|--------|
| 1 | Migración 1: campos ChecklistValidacion + backfill | S | Bajo (additive) |
| 2 | Migración 2: PlanPago.requiereParaEstado | S | Bajo (additive) |
| 3 | Migración 3: eliminar TERMINADA + backfill → LEGALIZACION | M | **Medio** — obras en TERMINADA deben migrar |
| 4 | Actualizar schema.prisma + generar client | S | Bajo |
| 5 | Crear `src/services/gate-engine.ts` (tipos + evaluateTransition + executeTransition) | L | Bajo |
| 6 | Crear endpoints: evaluate-transition, checklist submit, checklist review | M | Bajo |
| 7 | Refactorizar PATCH /api/obras/[id] → executeTransition | M | **Medio** — regresión |
| 8 | Refactorizar POST /api/campo/checkin → evaluateTransition | M | **Medio** — campo activo |
| 9 | Ajustar validacion-avanzada.service.ts: eliminar auto-transición, separar submit | M | Medio |
| 10 | Crear GateBlocker.tsx + OverrideModal.tsx | M | Bajo |
| 11 | Crear ChecklistReview.tsx (panel coordinador) | M | Bajo |
| 12 | Modificar ObraDetalle.tsx: pre-evaluación + review tab | M | Medio |
| 13 | Modificar /campo/validar-avanzado: borrador vs submit | M | Medio |
| 14 | Actualizar todas las refs a TERMINADA en código (configs, labels, ESTADO_CONFIG) | S | Bajo |
| 15 | Tests unitarios gate-engine | M | Bajo |
| 16 | Tests integración endpoints | M | Bajo |
| 17 | QA manual staging | M | Bajo |

**Leyenda:** S = <1h, M = 1-3h, L = 3-5h

### Riesgos y mitigación

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|-----------|
| Obras en TERMINADA al migrar | Media | Alto | Backfill a LEGALIZACION antes de eliminar enum value. Verificar count antes |
| Check-in en campo falla por nuevo gate | Media | Alto | Paso 8 bien testeado. Si gate falla, NO se crea checkin y el instalador recibe razón clara. Rollback: revertir cambio en checkin route |
| Referencias a TERMINADA dispersas en código | Alta | Medio | Paso 14: grep exhaustivo de 'TERMINADA' en todo src/ |
| Coordinadores no entienden nuevo flujo de review | Baja | Medio | UX clara: dos botones grandes Aprobar/Rechazar + formación |
| PlanPago sin requiereParaEstado en obras antiguas | Alta | Bajo | Gate se salta si no hay hitos vinculados. No bloquea obras existentes |

---

## 10) TESTING

### 10.1 Unit tests (gate-engine)

| Test | Valida |
|------|--------|
| `PROGRAMADA→INSTALANDO: fecha OK, sin jornada abierta → allowed` | Happy path check-in |
| `PROGRAMADA→INSTALANDO: fecha fuera tolerancia → blocked` | Gate fecha |
| `PROGRAMADA→INSTALANDO: jornada abierta otra obra → blocked` | Gate jornada |
| `VALIDACION_OP→REV_COORD: checklist SUBMITIDA → allowed` | Happy path |
| `VALIDACION_OP→REV_COORD: checklist BORRADOR → blocked` | Gate submit |
| `REV_COORD→LEGALIZACION: checklist APROBADA + hitos pagados + docs → allowed` | Happy path |
| `REV_COORD→LEGALIZACION: checklist APROBADA, hito pendiente → blocked` | Gate hitos |
| `REV_COORD→LEGALIZACION: checklist SUBMITIDA (no aprobada) → blocked` | Gate status |
| `REV_COORD→INSTALANDO: checklist RECHAZADA + notas → allowed` | Rechazo correcto |
| `REV_COORD→INSTALANDO: checklist NO rechazada → blocked` | Gate rechazo |
| `LEGALIZADA→COMPLETADA: 100% cobrado + sin incidencias → allowed` | Happy path |
| `LEGALIZADA→COMPLETADA: 80% cobrado → blocked` | Gate cobro |
| `Override: gates fallan + override ADMIN → allowed + isOverride=true` | Override |
| `Override: gates fallan + override COMERCIAL → blocked` | Rol no autorizado |
| `Race condition: from !== estado real → rejected` | Concurrencia |

### 10.2 Integration tests

| Test | Valida |
|------|--------|
| `POST checkin en PROGRAMADA → 201 + estado INSTALANDO` | Check-in triggerea transición |
| `POST checkin en PROGRAMADA, fecha fuera → 422 + reasons` | Check-in bloqueado |
| `PATCH submit checklist → status SUBMITIDA` | Submit endpoint |
| `PATCH review APROBADA → status APROBADA` | Review aprobar |
| `PATCH review RECHAZADA sin notas → 422` | Review requiere notas |
| `GET evaluate-transition → gates evaluados` | Pre-evaluación |

### 10.3 QA manual

- [ ] Crear obra → llevar hasta PROGRAMADA → check-in instalador → confirmar INSTALANDO
- [ ] Check-in con fecha fuera de tolerancia → ver error claro
- [ ] Validación: guardar borrador → enviar → confirmar SUBMITIDA
- [ ] Coordinador: aprobar → confirmar APROBADA → mover a LEGALIZACION
- [ ] Coordinador: rechazar con notas → confirmar RECHAZADA → mover a INSTALANDO
- [ ] Gate hitos: crear PlanPago con `requiereParaEstado = 'LEGALIZACION'` sin pagar → bloqueo
- [ ] Pagar hito → gate pasa → mover a LEGALIZACION
- [ ] Override: forzar sin hitos pagados → confirmar auditoría

---

## 11) ENTREGA

### 11.1 Archivos nuevos

| Archivo | Propósito |
|---------|----------|
| `src/services/gate-engine.ts` | Motor core |
| `src/app/api/obras/[id]/evaluate-transition/route.ts` | Pre-evaluación |
| `src/app/api/obras/[id]/checklist/[checklistId]/submit/route.ts` | Submit checklist |
| `src/app/api/obras/[id]/checklist/[checklistId]/review/route.ts` | Review checklist |
| `src/components/obras/GateBlocker.tsx` | UI gates fallidos |
| `src/components/obras/OverrideModal.tsx` | Modal override |
| `src/components/obras/ChecklistReview.tsx` | Panel revisión coordinador |
| `prisma/migrations/YYYYMMDD_add_checklist_review_workflow/` | Migración 1 |
| `prisma/migrations/YYYYMMDD_add_plan_pago_requiere_estado/` | Migración 2 |
| `prisma/migrations/YYYYMMDD_remove_terminada_state/` | Migración 3 |

### 11.2 Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Enum EstadoChecklist, campos ChecklistValidacion, PlanPago, eliminar TERMINADA |
| `src/services/obras.service.ts` | Simplificar cambiarEstadoObra → delegar a gate-engine, eliminar refs TERMINADA |
| `src/services/validacion-avanzada.service.ts` | Eliminar auto-transición a TERMINADA, separar submit |
| `src/app/api/obras/[id]/route.ts` | PATCH usa executeTransition |
| `src/app/api/campo/checkin/route.ts` | Integrar evaluateTransition para PROGRAMADA→INSTALANDO |
| `src/components/obras/ObraDetalle.tsx` | Pre-evaluación + GateBlocker + OverrideModal + tab review |
| `src/app/(campo)/campo/validar-avanzado/page.tsx` | Separar guardar borrador vs enviar |
| Todos los archivos con ESTADO_CONFIG / labels | Eliminar TERMINADA de configs |

### 11.3 Comandos

```bash
# 1. Migraciones (en orden)
npx prisma migrate dev --name add_checklist_review_workflow
npx prisma migrate dev --name add_plan_pago_requiere_estado
# Verificar: SELECT count(*) FROM obras WHERE estado = 'TERMINADA';
# Si hay obras, el backfill SQL se ejecuta dentro de la migración
npx prisma migrate dev --name remove_terminada_state

# 2. Generar client
npx prisma generate

# 3. Build y test
npm run build
npm run test

# 4. Deploy
pm2 restart all
```

### 11.4 Notas de despliegue

- **Orden de migraciones es crítico.** Migración 3 (eliminar TERMINADA) DEBE ir después del backfill.
- **Sin env vars nuevas.** `TOLERANCIA_DIAS` es constante en código.
- **Coordinar con equipo de campo:** informar que el check-in ahora puede ser rechazado si la fecha no cuadra. Antes entraba siempre.
- **Coordinar con coordinadores:** nuevo flujo de revisión de checklists. Ya no se auto-aprueba.
- **Rollback:** revertir las 3 migraciones en orden inverso + revertir archivos. Las obras que pasaron a LEGALIZACION desde TERMINADA no se deshacen automáticamente (revisar manualmente si hay alguna).

---

*Documento v2 listo para revisión. Confirma coherencia y procedo a implementar paso 1 (migraciones).*
