# Gate Engine v2 — Entrega Completa
## Auro Solar ERP · Sprint Motor de Gates

---

## Archivos Entregados (14 archivos)

### Backend — Servicios
| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `src/services/gate-engine.ts` | NUEVO | Motor core: evaluateTransition, executeTransition, evaluateCheckinTransition |
| `src/services/obras.service.ts` | REFACTORIZADO | cambiarEstadoObra delega a gate-engine. TERMINADA eliminado |
| `src/services/validacion-avanzada.service.ts` | REFACTORIZADO | Solo guarda BORRADOR. NO auto-transiciona |

### Backend — API Endpoints
| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `src/app/api/obras/[id]/route.ts` | REFACTORIZADO | PATCH usa executeTransition() |
| `src/app/api/obras/[id]/evaluate-transition/route.ts` | NUEVO | GET pre-evaluación para UX |
| `src/app/api/obras/[id]/checklist/[checklistId]/submit/route.ts` | NUEVO | PATCH submit checklist (BORRADOR→SUBMITIDA) |
| `src/app/api/obras/[id]/checklist/[checklistId]/review/route.ts` | NUEVO | PATCH aprobar/rechazar checklist |
| `src/app/api/campo/checkin/route.ts` | REFACTORIZADO | Usa evaluateCheckinTransition, transacción atómica |

### Frontend — Componentes
| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `src/components/obras/ObraDetalle.tsx` | REFACTORIZADO | Pre-evaluación, GateBlocker, OverrideModal, ChecklistReview integrados |
| `src/components/obras/GateBlocker.tsx` | NUEVO | Cards gates fallidos + botones acción |
| `src/components/obras/OverrideModal.tsx` | NUEVO | Modal override con motivo obligatorio |
| `src/components/obras/ChecklistReview.tsx` | NUEVO | Panel coordinador: aprobar/rechazar |

### Base de Datos
| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `prisma/schema-diff-v2.prisma` | NUEVO | Diffs: EstadoChecklist, campos ChecklistValidacion, PlanPago.requiereParaEstado |
| `prisma/migrations/20260226_gate_engine_v2/migration.sql` | NUEVO | Migración SQL completa (3 fases en 1) |

---

## Cambios Clave

### 1. TERMINADA eliminado
- Flujo: `REVISION_COORDINADOR → LEGALIZACION → LEGALIZADA → COMPLETADA`
- Backfill: obras en TERMINADA → LEGALIZACION
- Grep exhaustivo: CERO refs a TERMINADA en código funcional

### 2. Motor de Gates centralizado
- `evaluateTransition()` — evalúa TODOS los gates sin cortocircuitar
- `executeTransition()` — evalúa + ejecuta + audita en un flujo
- `evaluateCheckinTransition()` — versión especial con verificación de jornada cruzada
- Override: requiere `override === true` + rol ADMIN/JEFE_INST + nota ≥10 chars (backend enforced)
- Auditoría: ESTADO_CAMBIADO, OVERRIDE_ESTADO, TRANSICION_RECHAZADA

### 3. Cero Bypasses
- Check-in: `evaluateCheckinTransition()` + transacción atómica (prisma.$transaction)
- Validación avanzada: solo guarda BORRADOR, no transiciona
- Todo cambio de estado pasa por `executeTransition()` o transacción atómica en checkin

### 4. Workflow de Revisión Checklist
- Nuevo ciclo: BORRADOR → SUBMITIDA → APROBADA/RECHAZADA
- Campos: status, submittedAt/By, reviewedAt/By/Decision/Notes
- Coordinador aprueba/rechaza con notas obligatorias en rechazo
- Gates vinculados: CHECKLIST_SUBMITIDA, CHECKLIST_APROBADA, CHECKLIST_RECHAZADA

### 5. Pagos por Hito
- `PlanPago.requiereParaEstado`: vincula hito a estado concreto
- Gate HITOS_PAGO_LEGALIZACION, HITOS_PAGO_COMPLETADA
- Si no hay hitos vinculados, gate se salta (retrocompatible)

---

## Cómo Aplicar

```bash
# 1. Aplicar migración SQL
# ⚠️ ANTES verificar: SELECT count(*) FROM obras WHERE estado = 'TERMINADA';
psql -f prisma/migrations/20260226_gate_engine_v2/migration.sql

# 2. Actualizar schema.prisma con los diffs de schema-diff-v2.prisma

# 3. Generar Prisma client
npx prisma generate

# 4. Copiar archivos src/ al proyecto

# 5. grep exhaustivo de TERMINADA en el resto del proyecto
grep -rn "TERMINADA" src/ --include="*.ts" --include="*.tsx" | grep -v "// " | grep -v "SKILL"

# 6. Build y test
npm run build
npm run test

# 7. Deploy
pm2 restart all
```

---

## Tareas Pendientes (fuera de este sprint)

1. **grep TERMINADA en archivos NO entregados**: dashboard, sidebar, otros componentes
2. **Tests unitarios** del gate-engine (estructura planteada, no implementada)
3. **Actualizar campo/validar-avanzado/page.tsx**: separar "Guardar borrador" vs "Enviar para revisión" 
4. **Notificaciones**: checklist submitida → coordinador, rechazada → instalador
5. **Campo de fotos**: endpoint `/api/campo/fotos` (ya planteado en transcript anterior)
