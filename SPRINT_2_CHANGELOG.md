# Sprint 2 — Campo Real: Geolocalización + Jornada + Check-out + Obras filtradas

## Resumen
Sprint enfocado en hacer el módulo Campo **operativo de verdad** para los instaladores.
Tras este sprint, un instalador puede:
1. Ver SOLO sus obras asignadas (filtradas por backend)
2. Hacer check-in CON geolocalización real
3. Ver timer de jornada activo en el header (persistente)
4. Hacer check-out (fin de jornada en obra)
5. Las páginas de fotos, gastos, incidencia y validación pasan obraId automáticamente
6. Se corrige la API de incidencias campo (eliminar referencia a estado INCIDENCIA eliminado en Sprint 1)
7. Nuevo endpoint `/api/campo/obras` que filtra por instalador asignado

## Cambios

### 1. NUEVA API: GET /api/campo/obras
- Devuelve SOLO obras donde el instalador está asignado via ObraInstalador
- Filtra estados activos: PROGRAMADA, INSTALANDO, VALIDACION_OPERATIVA
- Incluye datos de cliente, dirección, potencia, checkin activo (sin horaSalida)
- **Seguridad**: Solo roles INSTALADOR y JEFE_INSTALACIONES

### 2. NUEVA API: PATCH /api/campo/checkin (check-out)
- Recibe `checkinId` + coordenadas opcionales de salida
- Registra `horaSalida` en el checkin
- Calcula duración
- Registra actividad CHECKOUT_REGISTRADO

### 3. NUEVA API: GET /api/campo/checkin/activo
- Devuelve el checkin activo (sin horaSalida) del instalador
- Usado para hidratar la tarjeta de jornada al cargar la app

### 4. REESCRITURA: Layout campo con jornada reactiva
- Componente `CampoHeader` (client) que:
  - Al montar, consulta `/api/campo/checkin/activo`
  - Si hay checkin activo: muestra obra, timer corriendo, botón checkout
  - Si no: muestra "sin jornada activa"
  - Timer se actualiza cada segundo
  - Check-out desde la tarjeta con confirmación

### 5. REESCRITURA: /campo (home)
- Usa `/api/campo/obras` en vez de `/api/obras?limit=20`
- Muestra checkin activo resaltado
- Acciones rápidas pasan obra activa si hay checkin

### 6. MEJORA: Check-in con geolocalización real
- `navigator.geolocation.getCurrentPosition()` al hacer check-in
- Coordenadas se envían al backend
- Toast con estado de geo (obtenida / denegada / timeout)
- Fallback graceful si el usuario deniega permisos

### 7. FIX: API campo/incidencias
- Eliminar referencia a estado 'INCIDENCIA' (eliminado en Sprint 1)
- Usar flag `tieneIncidenciaCritica` en su lugar

### 8. MEJORA: Validación → VALIDACION_OPERATIVA
- Al completar validación técnica, estado cambia a VALIDACION_OPERATIVA (no TERMINADA)
- Alineado con el flujo definido en Sprint 1

## Archivos nuevos
- `src/app/api/campo/obras/route.ts`
- `src/app/api/campo/checkin/activo/route.ts`  
- `src/components/campo/CampoHeader.tsx`

## Archivos modificados
- `src/app/(campo)/layout.tsx`
- `src/app/(campo)/campo/page.tsx`
- `src/app/(campo)/campo/checkin/page.tsx`
- `src/app/api/campo/checkin/route.ts` (añadir PATCH)
- `src/app/api/campo/incidencias/route.ts` (fix estado)
- `src/app/api/campo/validacion/route.ts` (→ VALIDACION_OPERATIVA)

## Tests manuales post-deploy
1. Login como INSTALADOR → /campo muestra SOLO sus obras
2. Check-in → pide geolocalización → timer arranca en header
3. Navegar a fotos/gastos → la obra activa se pre-selecciona
4. Check-out → confirmar → timer para, duración registrada
5. Validar obra → estado pasa a VALIDACION_OPERATIVA
6. Reportar incidencia CRITICA → flag tieneIncidenciaCritica = true
