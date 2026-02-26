# Sprint: Motor de Gates v2
## Auro Solar ERP

---

## Contenido del paquete

```
sprint-gate-engine-v2/
├── src/
│   ├── services/
│   │   ├── gate-engine.ts              ← Motor core (NUEVO)
│   │   ├── obras.service.ts            ← Refactorizado: delega a gate-engine
│   │   └── validacion-avanzada.service.ts ← Refactorizado: solo BORRADOR
│   ├── app/api/
│   │   ├── obras/[id]/
│   │   │   ├── route.ts                ← PATCH refactorizado
│   │   │   ├── evaluate-transition/route.ts  ← GET pre-evaluación (NUEVO)
│   │   │   └── checklist/[checklistId]/
│   │   │       ├── submit/route.ts     ← PATCH submit checklist (NUEVO)
│   │   │       └── review/route.ts     ← PATCH aprobar/rechazar (NUEVO)
│   │   └── campo/checkin/route.ts      ← Transacción atómica (REFACTORIZADO)
│   └── components/obras/
│       ├── ObraDetalle.tsx             ← Integración completa (REFACTORIZADO)
│       ├── GateBlocker.tsx             ← Cards de gates fallidos (NUEVO)
│       ├── OverrideModal.tsx           ← Modal override + motivo (NUEVO)
│       └── ChecklistReview.tsx         ← Panel coordinador (NUEVO)
├── prisma/
│   ├── schema-diff-v2.prisma           ← Cambios a aplicar en schema.prisma
│   └── migrations/20260226_gate_engine_v2/
│       └── migration.sql               ← Migración SQL (3 fases)
├── ENTREGA_GATE_ENGINE_v2.md           ← Documento de entrega detallado
├── DISEÑO_MOTOR_GATES_OBRA.md          ← Diseño técnico
├── PLANTILLA_MOTOR_GATES_v2.md         ← Plan de implementación
└── README.md                           ← Este archivo
```

## Instrucciones de deploy

### 1. Verificar estado actual

```bash
# Contar obras en estado TERMINADA antes de migrar
psql -c "SELECT estado, count(*) FROM obras GROUP BY estado ORDER BY estado;"
```

### 2. Aplicar migración SQL

```bash
# La migración hace 3 cosas en orden:
#   a) Crea enum EstadoChecklist + campos en checklist_validaciones
#   b) Añade requiere_para_estado en plan_pagos
#   c) Elimina TERMINADA del enum y backfill → LEGALIZACION
psql -f prisma/migrations/20260226_gate_engine_v2/migration.sql
```

### 3. Actualizar schema.prisma

Aplicar los diffs de `prisma/schema-diff-v2.prisma` al archivo `prisma/schema.prisma` del proyecto.

### 4. Regenerar Prisma Client

```bash
npx prisma generate
```

### 5. Copiar archivos src/

```bash
# Desde la raíz del proyecto:
cp -r src/services/* <proyecto>/src/services/
cp -r src/app/api/* <proyecto>/src/app/api/
cp -r src/components/obras/* <proyecto>/src/components/obras/
```

### 6. Grep de TERMINADA en el resto del proyecto

```bash
# IMPORTANTE: buscar refs a TERMINADA en archivos NO incluidos en este sprint
grep -rn "TERMINADA" src/ --include="*.ts" --include="*.tsx" \
  | grep -v "// " | grep -v ".md"
# Si aparecen → actualizar manualmente
```

### 7. Build y test

```bash
npm run build
npm run test  # si hay tests configurados
```

### 8. Deploy

```bash
pm2 restart all  # o el método de deploy que uséis
```

## Cambios principales

| Cambio | Impacto |
|--------|---------|
| Estado TERMINADA eliminado | Flujo: REV_COORDINADOR → LEGALIZACION directo |
| Motor de gates centralizado | Todo cambio de estado pasa por `executeTransition()` |
| Override requiere motivo | Backend enforced: rol + flag + nota ≥10 chars |
| Check-in atómico | `prisma.$transaction()`: si falla transición, no se crea checkin |
| Validación solo BORRADOR | No auto-transiciona; submit y review separados |
| Pagos por hito | `PlanPago.requiereParaEstado` vincula hitos a estados |

## Rollback

Si hay problemas:

1. Revertir archivos src/ al commit anterior
2. Revertir migración SQL (en orden inverso de las 3 fases)
3. Las obras movidas de TERMINADA → LEGALIZACION necesitan revisión manual
