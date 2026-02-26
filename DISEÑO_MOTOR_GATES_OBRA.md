# Motor de Gates — Estados de Obra
## Auro Solar ERP · Documento de diseño v1.0

> **OBJETIVO:** Antes de codificar, confirmar coherencia de estados, transiciones, gates y API.
> **NO SE IMPLEMENTA NADA** sin aprobación de este documento.

---

## 0. Hallazgos previos (incoherencias detectadas)

| # | Problema | Impacto | Acción propuesta |
|---|----------|---------|------------------|
| 1 | `deploy-crm-v2-files.sh` contiene enum viejo con `INCIDENCIA` como estado | Si se re-ejecuta ese script, machaca el schema correcto | Actualizar script o deprecar |
| 2 | Check-in (`/api/campo/checkin`) transiciona `PROGRAMADA→INSTALANDO` **sin pasar por motor de gates** | Bypass total de validaciones | Refactorizar para usar `evaluateTransition()` |
| 3 | Validación avanzada (`validacion-avanzada.service.ts`) mueve a `TERMINADA` directamente si resultado OK | Salta `VALIDACION_OPERATIVA→REVISION_COORDINADOR→TERMINADA` | Refactorizar para usar `evaluateTransition()` |
| 4 | El servicio actual devuelve errores como `throw new Error(string)` | No devuelve `{allowed, reasons[], actions[]}`, UX pobre | Reemplazar por nueva API `evaluateTransition()` |
| 5 | No hay gate para `PROGRAMADA→INSTALANDO` (instalador sin jornada activa, ventana horaria) | Cualquiera puede mover a INSTALANDO sin restricción real | Implementar gate |
| 6 | No hay gate para `INSTALANDO→VALIDACION_OPERATIVA` (fotos, fin jornada) | Se puede cerrar instalación sin evidencia | Implementar gate |

---

## A. Tabla de transiciones permitidas (from → to)

### Estados oficiales (enum `EstadoObra`)

```
REVISION_TECNICA → PREPARANDO → PENDIENTE_MATERIAL → PROGRAMADA →
INSTALANDO → VALIDACION_OPERATIVA → REVISION_COORDINADOR →
TERMINADA → LEGALIZACION → LEGALIZADA → COMPLETADA
```

`CANCELADA` es terminal pero reabrirle a `REVISION_TECNICA`.
`INCIDENCIA` **NO ES ESTADO** — es flag paralelo (`tieneIncidenciaCritica`).

### Matriz de transiciones

| Desde ↓ \ Hacia → | REV_TEC | PREP | PTE_MAT | PROG | INST | VAL_OP | REV_COORD | TERM | LEGAL | LEGALIZ | COMPL | CANCEL |
|--------------------|---------|------|---------|------|------|--------|-----------|------|-------|---------|-------|--------|
| **REVISION_TECNICA** | — | ✅ | — | — | — | — | — | — | — | — | — | ✅ |
| **PREPARANDO** | — | — | ✅ | ✅ | — | — | — | — | — | — | — | ✅ |
| **PENDIENTE_MATERIAL** | — | ✅ | — | ✅ | — | — | — | — | — | — | — | ✅ |
| **PROGRAMADA** | — | ✅ | — | — | ✅ | — | — | — | — | — | — | ✅ |
| **INSTALANDO** | — | — | — | — | — | ✅ | — | — | — | — | — | ✅ |
| **VALIDACION_OPERATIVA** | — | — | — | — | ✅ | — | ✅ | — | — | — | — | — |
| **REVISION_COORDINADOR** | — | — | — | — | ✅ | — | — | ✅ | — | — | — | — |
| **TERMINADA** | — | — | — | — | — | — | — | — | ✅ | — | — | ✅ |
| **LEGALIZACION** | — | — | — | — | — | — | — | — | — | ✅ | — | — |
| **LEGALIZADA** | — | — | — | — | — | — | — | — | — | — | ✅ | — |
| **COMPLETADA** | — | — | — | — | — | — | — | — | — | — | — | — |
| **CANCELADA** | ✅ | — | — | — | — | — | — | — | — | — | — | — |

### Notas sobre transiciones

- **VALIDACION_OPERATIVA → INSTALANDO**: Devolución si la validación falla (instalador debe corregir).
- **REVISION_COORDINADOR → INSTALANDO**: Coordinador rechaza y devuelve a campo.
- **REVISION_COORDINADOR → TERMINADA**: Coordinador aprueba.
- **CANCELADA → REVISION_TECNICA**: Reapertura (solo ADMIN/JEFE_INSTALACIONES).
- **LEGALIZACION y LEGALIZADA** no permiten cancelar (ya hay trámites legales en curso).

---

## B. Tabla de gates por transición

### Leyenda

- **Gate**: Condición que debe cumplirse.
- **Mensaje (reason)**: Texto devuelto al usuario si falla.
- **Acción sugerida (action)**: Lo que la UX debería proponer.
- **Bloqueo incidencia crítica**: Aplica a todas las transiciones salvo a `CANCELADA` e `INSTALANDO` (donde se puede estar resolviendo la incidencia).

### Gate global: Incidencias críticas

| Condición | Aplica a | Mensaje | Acción |
|-----------|----------|---------|--------|
| `tieneIncidenciaCritica === true` | Todas las transiciones excepto → `CANCELADA` y → `INSTALANDO` | "Hay {n} incidencia(s) CRÍTICA(s) sin resolver" | `{ type: 'NAVIGATE', target: '/obras/{id}/incidencias', label: 'Ver incidencias' }` |

---

### REVISION_TECNICA → PREPARANDO

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Cliente asignado | `obra.clienteId !== null` | "La obra debe tener un cliente asignado" | `{ type: 'EDIT_FIELD', field: 'clienteId', label: 'Asignar cliente' }` |
| Datos técnicos mínimos | `obra.potenciaKwp > 0 OR obra.tipo en tipos sin potencia` | "Se requiere potencia estimada (kWp)" | `{ type: 'EDIT_FIELD', field: 'potenciaKwp', label: 'Completar datos técnicos' }` |
| Presupuesto | `obra.presupuestoTotal > 0` | "Se requiere presupuesto total" | `{ type: 'EDIT_FIELD', field: 'presupuestoTotal', label: 'Añadir presupuesto' }` |

---

### PREPARANDO → PROGRAMADA

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Fecha programada | `obra.fechaProgramada !== null` | "Se debe asignar fecha de instalación" | `{ type: 'NAVIGATE', target: '/planificacion', label: 'Ir a planificación' }` |
| Instaladores asignados | `obra.instaladores.length > 0` | "Se deben asignar instaladores" | `{ type: 'NAVIGATE', target: '/planificacion', label: 'Asignar equipo' }` |
| Dirección instalación | `obra.direccionInstalacion !== null` | "Se requiere dirección de instalación" | `{ type: 'EDIT_FIELD', field: 'direccionInstalacion', label: 'Añadir dirección' }` |

---

### PREPARANDO → PENDIENTE_MATERIAL / PENDIENTE_MATERIAL → PROGRAMADA

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| (PREP→PTE_MAT) Solicitud material creada | `solicitudesMaterial.length > 0 OR nota explicativa` | "Indique qué material falta (cree solicitud o añada nota)" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=materiales', label: 'Gestionar materiales' }` |
| (PTE_MAT→PROG) Material recibido o confirmado | `solicitudes en estado RECIBIDA o nota de confirmación` | "Hay solicitudes de material pendientes de recepción" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=materiales', label: 'Verificar materiales' }` |

---

### PROGRAMADA → INSTALANDO

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Fecha programada = hoy (±tolerancia) | `abs(obra.fechaProgramada - hoy) <= TOLERANCIA_DIAS` | "La obra está programada para {fecha}, no para hoy (tolerancia: {n} días)" | `{ type: 'INFO', label: 'Reprogramar si es necesario' }` |
| Instalador sin jornada activa en otra obra | `no existe checkin abierto del instalador en otra obra` | "El instalador {nombre} tiene jornada activa en obra {codigo}" | `{ type: 'NAVIGATE', target: '/campo/checkin', label: 'Cerrar jornada anterior' }` |
| Check-in registrado | `existe checkin del instalador para esta obra hoy` | "Se requiere check-in del instalador en la obra" | `{ type: 'NAVIGATE', target: '/campo/checkin', label: 'Hacer check-in' }` |

> **NOTA CONFIG**: `TOLERANCIA_DIAS` = configurable (propuesta: 1 día). Se puede aumentar para obras que se retrasan un día.

---

### INSTALANDO → VALIDACION_OPERATIVA

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Jornada cerrada o pausada | `último checkin del instalador tiene horaFin !== null` | "Debe cerrar o pausar la jornada activa" | `{ type: 'NAVIGATE', target: '/campo/checkin', label: 'Cerrar jornada' }` |
| Fotos mínimas subidas | `documentos de tipo FOTO con categoría en [ARRAY_PANELES, INVERSOR] >= 2` | "Se requieren al menos fotos de: array de paneles e inversor instalado" | `{ type: 'NAVIGATE', target: '/campo/validar', label: 'Subir fotos' }` |

---

### VALIDACION_OPERATIVA → REVISION_COORDINADOR

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Checklist validación completado | `checklistValidacion con resultado !== 'BORRADOR'` | "Se debe completar el checklist de validación operativa" | `{ type: 'NAVIGATE', target: '/campo/validar-avanzado?obra={id}', label: 'Completar checklist' }` |
| Serial inversor registrado | `checklistValidacion.serialInversor !== null` | "Se requiere el serial del inversor" | `{ type: 'NAVIGATE', target: '/campo/validar-avanzado?obra={id}', label: 'Registrar serial' }` |
| Foto cuadro protecciones | `existe checklist item PROTECCIONES_AC con respuesta SI` | "Se requiere confirmación de protecciones AC" | `{ type: 'NAVIGATE', target: '/campo/validar-avanzado?obra={id}', label: 'Verificar protecciones' }` |
| Ítems críticos OK | `ningún ítem crítico del checklist tiene respuesta 'NO'` | "{n} ítem(s) crítico(s) fallido(s) en checklist" | `{ type: 'NAVIGATE', target: '/campo/validar-avanzado?obra={id}', label: 'Revisar ítems críticos' }` |

---

### REVISION_COORDINADOR → TERMINADA

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Validación aprobada | `checklistValidacion.resultado in ['OK', 'OK_CON_OBS']` | "La validación no fue aprobada" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=validacion', label: 'Revisar validación' }` |
| Anticipo cobrado (≥40%) | `(totalPagado / presupuestoTotal) >= 0.40` | "Se requiere al menos 40% cobrado (actual: {n}%)" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=pagos', label: 'Registrar cobro' }` |
| Docs mínimos | `docs de tipo [PRESUPUESTO, CONTRATO] existen` | "Faltan documentos: {lista}" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=documentos', label: 'Subir documentos' }` |

---

### TERMINADA → LEGALIZACION

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Validación OK (redundante por seguridad) | `checklistValidacion.resultado in ['OK', 'OK_CON_OBS']` | "Se requiere validación técnica aprobada" | — |
| Activos registrados | `obra.activos.length > 0 (al menos inversor)` | "Se deben registrar los activos instalados (inversor, paneles...)" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=activos', label: 'Registrar activos' }` |

---

### LEGALIZACION → LEGALIZADA

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Sin incidencias críticas abiertas | `incidencias CRITICAS en estado ABIERTA/EN_PROCESO === 0` | "Hay incidencias críticas pendientes" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=incidencias', label: 'Resolver incidencias' }` |
| Expediente legal | `obra.expedienteLegal !== null OR estadoLegalizacion in [APROBADA, INSCRITA]` | "Se requiere número de expediente o estado de legalización avanzado" | `{ type: 'EDIT_FIELD', field: 'expedienteLegal', label: 'Registrar expediente' }` |

---

### LEGALIZADA → COMPLETADA

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Sin incidencias críticas | `incidencias CRITICAS abiertas === 0` | "Hay incidencias críticas pendientes" | Ver incidencias |
| 100% cobrado | `totalPagado >= presupuestoTotal` | "Pago pendiente: {importe}€ (cobrado {n}%)" | `{ type: 'NAVIGATE', target: '/obras/{id}?tab=pagos', label: 'Registrar cobro final' }` |
| Docs finales | `docs de tipo [BOLETIN, CERTIFICADO_INSTALACION] existen (si aplica)` | "Faltan documentos finales de legalización" | Subir documentos |

---

### → CANCELADA (desde cualquier estado que lo permita)

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Motivo obligatorio | `nota !== null && nota.length >= 10` | "Se requiere motivo de cancelación (mínimo 10 caracteres)" | `{ type: 'INPUT', field: 'nota', label: 'Escribir motivo' }` |

---

### CANCELADA → REVISION_TECNICA (reapertura)

| Gate | Condición | Mensaje si falla | Acción sugerida |
|------|-----------|------------------|-----------------|
| Solo ADMIN/JEFE_INSTALACIONES | `rol in ROLES_OVERRIDE` | "Solo Admin o Jefe de Instalaciones puede reabrir obras canceladas" | — |
| Motivo obligatorio | `nota !== null && nota.length >= 10` | "Se requiere motivo de reapertura" | `{ type: 'INPUT', field: 'nota', label: 'Motivo de reapertura' }` |

---

## C. Diseño API/Servicio: `evaluateTransition()`

### Firma

```typescript
interface TransitionRequest {
  obraId: string;
  from: EstadoObra;    // Estado actual (se valida contra BD)
  to: EstadoObra;      // Estado deseado
  userId: string;
  userRol: Rol;
  nota?: string;
  override?: boolean;  // Solo ADMIN/JEFE_INSTALACIONES
}

interface GateResult {
  gate: string;         // Nombre del gate: "FECHA_PROGRAMADA", "CHECKIN_ACTIVO", etc.
  passed: boolean;
  reason?: string;      // Mensaje humano si !passed
  action?: SuggestedAction;
}

interface SuggestedAction {
  type: 'NAVIGATE' | 'EDIT_FIELD' | 'INPUT' | 'INFO' | 'CONFIRM';
  target?: string;      // URL relativa
  field?: string;       // Campo a editar
  label: string;        // Texto del botón/enlace
}

interface TransitionResult {
  allowed: boolean;
  isOverride: boolean;     // true si se usó override
  gates: GateResult[];     // Todos los gates evaluados (passed + failed)
  reasons: string[];       // Solo los mensajes de gates fallidos
  actions: SuggestedAction[]; // Solo las acciones de gates fallidos
}
```

### Flujo de `evaluateTransition()`

```
1. Cargar obra con includes necesarios (incidencias, pagos, checkins, checklist, docs, activos)
2. Validar que from === obra.estado actual (prevenir race condition)
3. Validar que la transición from→to existe en TRANSICIONES_VALIDAS
   - Si no existe y NO es override → return { allowed: false, reason: "Transición no válida" }
4. Si override && rol en ROLES_OVERRIDE → marcar isOverride=true, saltar gates (pero registrar TODOS)
5. Evaluar TODOS los gates de la transición (no cortocircuitar al primer fallo)
6. Si algún gate falla y NO es override → return { allowed: false, gates, reasons, actions }
7. Si todos pasan (o override) → return { allowed: true, gates, reasons: [], actions: [] }
```

### Flujo de `executeTransition()` (separado de evaluate)

```
1. Llamar evaluateTransition()
2. Si !allowed → devolver resultado tal cual (HTTP 422)
3. Si allowed:
   a. Actualizar obra.estado = to
   b. Actualizar fechas relevantes (fechaInicio, fechaFin, fechaValidacion...)
   c. Crear registro en ACTIVIDAD con:
      - accion: 'ESTADO_CAMBIADO'
      - detalle: JSON { estadoAnterior, nuevoEstado, nota, override, gatesEvaluados }
   d. Si override: crear SEGUNDO registro en ACTIVIDAD:
      - accion: 'OVERRIDE_ESTADO'
      - detalle: JSON { estadoAnterior, nuevoEstado, motivoOverride: nota, gatesFallidos }
   e. Recalcular flag incidencia crítica si necesario
   f. Devolver obra actualizada + transicionesDisponibles nuevas
```

### Endpoint API

```
PATCH /api/obras/[id]
Body: { estado, nota?, override? }

Response 200 (éxito):
{
  ok: true,
  data: { obra, transicionesDisponibles }
}

Response 422 (gates fallidos):
{
  ok: false,
  error: "No se puede cambiar a {estado}",
  data: {
    allowed: false,
    isOverride: false,
    reasons: ["Motivo 1", "Motivo 2"],
    actions: [{ type: "NAVIGATE", target: "...", label: "..." }],
    gates: [{ gate: "...", passed: false, reason: "...", action: {...} }]
  }
}
```

### Endpoint de pre-evaluación (para UX)

```
GET /api/obras/[id]/evaluate-transition?to={ESTADO}

Response 200:
{
  ok: true,
  data: {
    allowed: boolean,
    isOverride: false,
    gates: [...],
    reasons: [...],
    actions: [...]
  }
}
```

> Este endpoint permite que el frontend muestre **antes de intentar** el cambio qué gates fallan y qué acciones debe tomar el usuario. No modifica nada.

---

## D. Estructura AuditLog (modelo `Actividad`)

### Modelo actual (ya existe, lo reutilizamos)

```prisma
model Actividad {
  id         String   @id @default(uuid())
  obraId     String?  @map("obra_id")
  usuarioId  String   @map("usuario_id")
  accion     String   // Ver catálogo abajo
  entidad    String   // obra, pago, incidencia, checkin, etc.
  entidadId  String?  @map("entidad_id")
  detalle    String?  // JSON con datos before/after
  createdAt  DateTime @default(now()) @map("created_at")
}
```

### Acciones de auditoría para cambios de estado

| Acción | Cuándo | Detalle JSON |
|--------|--------|-------------|
| `ESTADO_CAMBIADO` | Cada cambio de estado exitoso | `{ estadoAnterior, nuevoEstado, nota, gatesEvaluados: [{gate, passed}] }` |
| `OVERRIDE_ESTADO` | Cada override (además de `ESTADO_CAMBIADO`) | `{ estadoAnterior, nuevoEstado, motivoOverride, gatesFallidos: [{gate, reason}], aprobadoPor: userId }` |
| `TRANSICION_RECHAZADA` | Intento fallido de cambio (opcional, para análisis) | `{ estadoActual, estadoIntentado, reasons[], userId }` |

### Ejemplo de registro OVERRIDE

```json
{
  "accion": "OVERRIDE_ESTADO",
  "detalle": {
    "estadoAnterior": "REVISION_COORDINADOR",
    "nuevoEstado": "TERMINADA",
    "motivoOverride": "Cliente urgente, anticipo pendiente se cobra mañana confirmado por dirección",
    "gatesFallidos": [
      {
        "gate": "ANTICIPO_COBRADO_40",
        "reason": "Se requiere al menos 40% cobrado (actual: 25%)"
      }
    ],
    "aprobadoPor": "uuid-admin-123"
  }
}
```

---

## E. Plan de implementación incremental

### Fase 1: Core del motor (sin romper nada)

1. Crear `src/services/gate-engine.ts` con:
   - `TRANSICIONES_VALIDAS` (mover desde `obras.service.ts`)
   - `GATES_POR_TRANSICION` (registro completo)
   - `evaluateTransition()`
   - `executeTransition()` (wrapper que evalúa + ejecuta + audita)
2. Crear `GET /api/obras/[id]/evaluate-transition`
3. Tests unitarios del motor (al menos las transiciones principales)

### Fase 2: Migrar cambiarEstadoObra()

4. Refactorizar `cambiarEstadoObra()` en `obras.service.ts` para delegar en `executeTransition()`
5. Ajustar endpoint `PATCH /api/obras/[id]` para devolver formato nuevo `{allowed, reasons, actions}`

### Fase 3: Corregir bypasses

6. Refactorizar `/api/campo/checkin` para usar `evaluateTransition()` antes de transicionar
7. Refactorizar `validacion-avanzada.service.ts` para usar `evaluateTransition()`

### Fase 4: UX

8. Frontend: antes de cambiar estado, llamar a `evaluate-transition` y mostrar gates/acciones
9. Modal de override con campo de motivo obligatorio

---

## Preguntas abiertas (NECESITO CONFIRMACIÓN)

1. **TOLERANCIA_DIAS para PROGRAMADA→INSTALANDO**: ¿1 día? ¿Configurable por tipo de obra?

2. **Fotos mínimas en INSTALANDO→VALIDACION_OPERATIVA**: ¿Son siempre las mismas (array + inversor) o dependen del tipo de instalación? Por ejemplo, aerotermia no tiene array de paneles.

3. **Docs mínimos en REVISION_COORDINADOR→TERMINADA**: ¿PRESUPUESTO y CONTRATO siempre? ¿Hay tipos de obra donde no aplica contrato?

4. **Gate de anticipo 40%**: ¿Aplica siempre? ¿Hay excepciones (financiación bancaria, administración pública)?

5. **LEGALIZACION→LEGALIZADA**: ¿Es suficiente con tener expediente legal o se requiere que `estadoLegalizacion` esté en `APROBADA` o `INSCRITA`?

6. **Docs finales para LEGALIZADA→COMPLETADA**: ¿BOLETIN y CERTIFICADO_INSTALACION siempre obligatorios? ¿Solo para ciertas potencias o tipos?

7. **¿Registrar intentos fallidos (TRANSICION_RECHAZADA)?** Útil para análisis pero genera más registros. ¿Sí o no?

8. **¿El check-in debería ser el ÚNICO mecanismo para pasar a INSTALANDO?** O ¿un coordinador puede mover manualmente (sin check-in) si el instalador no tiene acceso al móvil?

---

*Documento generado para revisión. No codificar hasta confirmar coherencia.*
