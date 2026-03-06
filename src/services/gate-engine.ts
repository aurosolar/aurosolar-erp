import { registrarEvento } from '@/services/auditoria-hmac.service';
import { getPerfilObra, shouldSkipGate } from '@/services/obra-profiles';
// src/services/gate-engine.ts
// ═══════════════════════════════════════════════════════════
// MOTOR DE GATES — Validación de transiciones de estado de obra
// Toda transición de estado DEBE pasar por aquí. Sin excepciones.
//
// REGLAS:
// - evaluateTransition() evalúa gates objetivamente. NO concede override.
// - executeTransition() es el ÚNICO punto de escritura de estado.
// - Override requiere: flag explícito + rol autorizado + nota >= 10 chars.
// - presupuestoTotal y todos los importes están en CÉNTIMOS.
// ═══════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import * as notificaciones from '@/services/notificaciones.service';
import type { EstadoObra, Rol } from '@prisma/client';

// ── Configuración ──
const TOLERANCIA_DIAS = 1;
const ROLES_OVERRIDE: Rol[] = ['ADMIN', 'JEFE_INSTALACIONES'];

// ── Tipos públicos ──

export interface SuggestedAction {
  type: 'NAVIGATE' | 'EDIT_FIELD' | 'INPUT' | 'INFO' | 'CONFIRM';
  target?: string;
  field?: string;
  label: string;
}

export interface GateResult {
  gate: string;
  passed: boolean;
  reason?: string;
  action?: SuggestedAction;
}

export interface TransitionResult {
  allowed: boolean;
  isOverride: boolean;
  gates: GateResult[];
  reasons: string[];
  actions: SuggestedAction[];
}

// ── Tipo interno: obra con datos para evaluar gates ──
// NOTA: importes en CÉNTIMOS (Int en Prisma). Dividir /100 solo para display.
interface ObraConDatos {
  id: string;
  codigo: string;
  estado: EstadoObra;
  tipo: string;
  clienteId: string | null;
  presupuestoTotal: number;       // Céntimos
  costeTotal: number;             // Céntimos
  fechaProgramada: Date | null;
  fechaInicio: Date | null;
  direccionInstalacion: string | null;
  expedienteLegal: string | null;
  estadoLegalizacion: string | null;
  tieneIncidenciaCritica: boolean;
  version: number;
  instaladores: Array<{
    instaladorId: string;
    instalador: { id: string; nombre: string; apellidos: string };
  }>;
  checkins: Array<{
    id: string; instaladorId: string; horaSalida: Date | null; obraId: string;
  }>;
  pagos: Array<{ importe: number }>;
  planPagos: Array<{
    concepto: string; pagado: boolean; requiereParaEstado: string | null;
  }>;
  documentos: Array<{ tipo: string }>;
  incidencias: Array<{ gravedad: string; estado: string }>;
  activos: Array<{ id: string }>;
  checklistValidaciones: Array<{
    id: string;
    status: string;       // EstadoChecklist
    resultado: string;    // ResultadoValidacion
    serialInversor: string | null;
    reviewNotes: string | null;
    items: Array<{ codigo: string; critico: boolean; respuesta: string | null }>;
  }>;
}

// ═══════════════════════════════════════════
// TRANSICIONES PERMITIDAS (sin TERMINADA)
// ═══════════════════════════════════════════

export const TRANSICIONES_VALIDAS: Record<EstadoObra, EstadoObra[]> = {
  REVISION_TECNICA:      ['PREPARANDO', 'CANCELADA'],
  PREPARANDO:            ['PENDIENTE_MATERIAL', 'PROGRAMADA', 'CANCELADA'],
  PENDIENTE_MATERIAL:    ['PREPARANDO', 'PROGRAMADA', 'CANCELADA'],
  PROGRAMADA:            ['INSTALANDO', 'PREPARANDO', 'CANCELADA'],
  INSTALANDO:            ['VALIDACION_OPERATIVA', 'CANCELADA'],
  VALIDACION_OPERATIVA:  ['REVISION_COORDINADOR', 'INSTALANDO'],
  REVISION_COORDINADOR:  ['LEGALIZACION', 'INSTALANDO'],
  LEGALIZACION:          ['LEGALIZADA'],
  LEGALIZADA:            ['COMPLETADA'],
  COMPLETADA:            [],
  CANCELADA:             ['REVISION_TECNICA'],
};

// ═══════════════════════════════════════════
// CARGA DE DATOS
// ═══════════════════════════════════════════

async function cargarObraCompleta(obraId: string): Promise<ObraConDatos | null> {
  return prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      instaladores: {
        include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
      },
      checkins: {
        where: { horaSalida: null },
        orderBy: { horaEntrada: 'desc' },
      },
      pagos: { select: { importe: true } },
      planPagos: {
        select: { concepto: true, pagado: true, requiereParaEstado: true },
        orderBy: { orden: 'asc' },
      },
      documentos: {
        where: { deletedAt: null },
        select: { tipo: true },
      },
      incidencias: {
        where: { estado: { in: ['ABIERTA', 'EN_PROCESO'] } },
        select: { gravedad: true, estado: true },
      },
      activos: { select: { id: true } },
      checklistValidaciones: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          items: { select: { codigo: true, critico: true, respuesta: true } },
        },
      },
    },
  }) as unknown as ObraConDatos | null;
}

// ═══════════════════════════════════════════
// HELPERS DE GATE
// ═══════════════════════════════════════════

type GateFunction = (
  obra: ObraConDatos,
  ctx: { userId: string; nota?: string },
) => GateResult;

function gate(
  id: string,
  passed: boolean,
  reason?: string,
  action?: SuggestedAction,
): GateResult {
  return {
    gate: id,
    passed,
    reason: passed ? undefined : reason,
    action: passed ? undefined : action,
  };
}

function gateIncidenciaCritica(obra: ObraConDatos, to: EstadoObra): GateResult | null {
  if (to === 'CANCELADA' || to === 'INSTALANDO') return null;
  if (!obra.tieneIncidenciaCritica) return null;
  const n = obra.incidencias.filter(i => i.gravedad === 'CRITICA').length;
  if (n === 0) return null;
  return gate(
    'INCIDENCIA_CRITICA', false,
    `Hay ${n} incidencia(s) CRÍTICA(s) sin resolver`,
    { type: 'NAVIGATE', target: `/obras/${obra.id}?tab=incidencias`, label: 'Ver incidencias' },
  );
}

// ═══════════════════════════════════════════
// DEFINICIÓN DE GATES POR TRANSICIÓN
// ═══════════════════════════════════════════

const GATES: Partial<Record<string, GateFunction[]>> = {

  'REVISION_TECNICA→PREPARANDO': [
    (o) => gate('CLIENTE_ASIGNADO', !!o.clienteId,
      'La obra debe tener un cliente asignado',
      { type: 'EDIT_FIELD', field: 'clienteId', label: 'Asignar cliente' }),
    (o) => gate('PRESUPUESTO', o.presupuestoTotal > 0,
      'Se requiere presupuesto total',
      { type: 'EDIT_FIELD', field: 'presupuestoTotal', label: 'Añadir presupuesto' }),
  ],

  'PREPARANDO→PROGRAMADA': [
    (o) => gate('FECHA_PROGRAMADA', !!o.fechaProgramada,
      'Se debe asignar fecha de instalación',
      { type: 'NAVIGATE', target: '/planificacion', label: 'Ir a planificación' }),
    (o) => gate('INSTALADORES_ASIGNADOS', o.instaladores.length > 0,
      'Se deben asignar instaladores',
      { type: 'NAVIGATE', target: '/planificacion', label: 'Asignar equipo' }),
    (o) => gate('DIRECCION_INSTALACION', !!o.direccionInstalacion,
      'Se requiere dirección de instalación',
      { type: 'EDIT_FIELD', field: 'direccionInstalacion', label: 'Añadir dirección' }),
  ],

  'PENDIENTE_MATERIAL→PROGRAMADA': [
    (o) => gate('FECHA_PROGRAMADA', !!o.fechaProgramada,
      'Se debe asignar fecha de instalación',
      { type: 'NAVIGATE', target: '/planificacion', label: 'Ir a planificación' }),
    (o) => gate('INSTALADORES_ASIGNADOS', o.instaladores.length > 0,
      'Se deben asignar instaladores',
      { type: 'NAVIGATE', target: '/planificacion', label: 'Asignar equipo' }),
    (o) => gate('DIRECCION_INSTALACION', !!o.direccionInstalacion,
      'Se requiere dirección de instalación',
      { type: 'EDIT_FIELD', field: 'direccionInstalacion', label: 'Añadir dirección' }),
  ],

  'PROGRAMADA→INSTALANDO': [
    (o) => {
      if (!o.fechaProgramada) return gate('FECHA_TOLERANCIA', false, 'No hay fecha programada');
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const prog = new Date(o.fechaProgramada); prog.setHours(0, 0, 0, 0);
      const diff = Math.abs(hoy.getTime() - prog.getTime()) / 86_400_000;
      return gate('FECHA_TOLERANCIA', diff <= TOLERANCIA_DIAS,
        `Obra programada para ${prog.toLocaleDateString('es-ES')}, no para hoy (tolerancia: ±${TOLERANCIA_DIAS}d)`,
        { type: 'INFO', label: 'Contactar coordinación para reprogramar' });
    },
    // Gate de jornada cruzada se evalúa en evaluateCheckinTransition con query directa
    () => gate('INSTALADOR_SIN_JORNADA_OTRA_OBRA', true),
  ],

  'INSTALANDO→VALIDACION_OPERATIVA': [
    (o) => {
      const abierto = o.checkins.some(c => !c.horaSalida && c.obraId === o.id);
      return gate('JORNADA_CERRADA', !abierto,
        'Hay jornada activa sin cerrar en esta obra',
        { type: 'NAVIGATE', target: '/campo/checkin', label: 'Cerrar jornada' });
    },
    (o) => {
      const fotoTipos = ['FOTO_INSTALACION', 'FOTO_INVERSOR', 'FOTO_PANELES', 'FOTO_CUADRO', 'FOTO_GENERAL'];
      const n = o.documentos.filter(d => fotoTipos.includes(d.tipo)).length;
      return gate('FOTOS_MINIMAS', n >= 2,
        `Se necesitan al menos 2 fotos de la instalación (hay ${n})`,
        { type: 'NAVIGATE', target: '/campo/validar', label: 'Subir fotos' });
    },
  ],

  'VALIDACION_OPERATIVA→REVISION_COORDINADOR': [
    (o) => {
      const cl = o.checklistValidaciones[0];
      return gate('CHECKLIST_SUBMITIDA', !!cl && cl.status === 'SUBMITIDA',
        cl ? `El checklist está en estado ${cl.status}. Debe enviarlo para revisión`
           : 'Debe completar y enviar el checklist de validación',
        { type: 'NAVIGATE', target: `/campo/validar-avanzado?obra=${o.id}`, label: 'Completar y enviar checklist' });
    },
    (o) => {
      const cl = o.checklistValidaciones[0];
      return gate('SERIAL_INVERSOR', !!cl?.serialInversor,
        'Se requiere serial del inversor',
        { type: 'NAVIGATE', target: `/campo/validar-avanzado?obra=${o.id}`, label: 'Registrar serial' });
    },
    (o) => {
      const cl = o.checklistValidaciones[0];
      if (!cl) return gate('ITEMS_CRITICOS_OK', false, 'No hay checklist de validación');
      const fallidos = cl.items.filter(i => i.critico && i.respuesta === 'NO');
      return gate('ITEMS_CRITICOS_OK', fallidos.length === 0,
        `${fallidos.length} ítem(s) crítico(s) fallido(s)`,
        { type: 'NAVIGATE', target: `/campo/validar-avanzado?obra=${o.id}`, label: 'Revisar ítems críticos' });
    },
  ],

  'REVISION_COORDINADOR→LEGALIZACION': [
    (o) => {
      const cl = o.checklistValidaciones[0];
      return gate('CHECKLIST_APROBADA', !!cl && cl.status === 'APROBADA',
        cl ? `La validación está en estado ${cl.status}. Debe ser aprobada por el coordinador`
           : 'No hay checklist de validación',
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=validacion`, label: 'Revisar validación' });
    },
    (o) => {
      const hitos = o.planPagos.filter(h => h.requiereParaEstado === 'LEGALIZACION');
      if (hitos.length === 0) return gate('HITOS_PAGO_LEGALIZACION', true);
      const pendientes = hitos.filter(h => !h.pagado);
      return gate('HITOS_PAGO_LEGALIZACION', pendientes.length === 0,
        `Hitos de pago pendientes para legalizar: ${pendientes.map(h => h.concepto).join(', ')}`,
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=pagos`, label: 'Ir a cobros' });
    },
    (o) => {
      const tiene = o.documentos.some(d => ['PRESUPUESTO', 'CONTRATO'].includes(d.tipo));
      return gate('DOCS_MINIMOS', tiene,
        'Falta documentación: presupuesto o contrato',
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=documentos`, label: 'Subir documentos' });
    },
    (o) => gate('ACTIVOS_REGISTRADOS', o.activos.length > 0,
      'Registre los activos instalados (inversor, paneles...)',
      { type: 'NAVIGATE', target: `/obras/${o.id}?tab=activos`, label: 'Registrar activos' }),
  ],

  'REVISION_COORDINADOR→INSTALANDO': [
    (o) => {
      const cl = o.checklistValidaciones[0];
      return gate('CHECKLIST_RECHAZADA', !!cl && cl.status === 'RECHAZADA',
        'Debe rechazar la validación antes de devolver a campo',
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=validacion`, label: 'Rechazar validación' });
    },
    (o) => {
      const cl = o.checklistValidaciones[0];
      return gate('REVIEW_NOTES', !!cl?.reviewNotes && cl.reviewNotes.length >= 10,
        'Indique el motivo del rechazo en la validación (mín. 10 caracteres)',
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=validacion`, label: 'Añadir notas de rechazo' });
    },
  ],

  'LEGALIZACION→LEGALIZADA': [
    (o) => {
      const exp = !!o.expedienteLegal;
      const avz = !!o.estadoLegalizacion && ['APROBADA', 'INSCRITA'].includes(o.estadoLegalizacion);
      return gate('EXPEDIENTE_O_ESTADO_LEGAL', exp || avz,
        'Falta nº expediente o estado legalización avanzado (APROBADA/INSCRITA)',
        { type: 'EDIT_FIELD', field: 'expedienteLegal', label: 'Registrar expediente' });
    },
  ],

  'LEGALIZADA→COMPLETADA': [
    (o) => {
      const hitos = o.planPagos.filter(h => h.requiereParaEstado === 'COMPLETADA');
      if (hitos.length === 0) return gate('HITOS_PAGO_COMPLETADA', true);
      const pend = hitos.filter(h => !h.pagado);
      return gate('HITOS_PAGO_COMPLETADA', pend.length === 0,
        `Hitos de pago pendientes: ${pend.map(h => h.concepto).join(', ')}`,
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=pagos`, label: 'Ir a cobros' });
    },
    (o) => {
      const pagado = o.pagos.reduce((s, p) => s + p.importe, 0); // Céntimos
      const pct = o.presupuestoTotal > 0 ? Math.round((pagado / o.presupuestoTotal) * 100) : 100;
      const pendEur = ((o.presupuestoTotal - pagado) / 100).toFixed(2); // Céntimos→Euros
      return gate('COBRO_TOTAL', pagado >= o.presupuestoTotal,
        `Pendiente: ${pendEur}€ (cobrado ${pct}%)`,
        { type: 'NAVIGATE', target: `/obras/${o.id}?tab=pagos`, label: 'Registrar cobro final' });
    },
  ],

  'ANY→CANCELADA': [
    (_o, ctx) => gate('MOTIVO_CANCELACION', !!ctx.nota && ctx.nota.length >= 10,
      'Motivo de cancelación obligatorio (mín. 10 caracteres)',
      { type: 'INPUT', field: 'nota', label: 'Escribir motivo' }),
  ],

  'CANCELADA→REVISION_TECNICA': [
    (_o, ctx) => gate('MOTIVO_REAPERTURA', !!ctx.nota && ctx.nota.length >= 10,
      'Motivo de reapertura obligatorio (mín. 10 caracteres)',
      { type: 'INPUT', field: 'nota', label: 'Motivo de reapertura' }),
  ],
};

// ═══════════════════════════════════════════
// evaluateTransition — PURA evaluación, NUNCA concede override
// ═══════════════════════════════════════════

export async function evaluateTransition(
  obraId: string,
  to: EstadoObra,
  userId: string,
  userRol: Rol,
  nota?: string,
): Promise<TransitionResult & { obra: ObraConDatos }> {
  const obra = await cargarObraCompleta(obraId);
  if (!obra) throw new Error('Obra no encontrada');

  const from = obra.estado;
  const isOverrideRole = ROLES_OVERRIDE.includes(userRol);
  const results: GateResult[] = [];

  // 1. Transición válida (sin excepciones de rol)
  const permitidas = TRANSICIONES_VALIDAS[from] || [];
  if (!permitidas.includes(to)) {
    return {
      allowed: false, isOverride: false,
      gates: [gate('TRANSICION_VALIDA', false,
        `Transición no válida: ${from} → ${to}. Permitidas: ${permitidas.join(', ')}`)],
      reasons: [`Transición no válida: ${from} → ${to}`],
      actions: [], obra,
    };
  }

  // 2. Gate global: incidencia crítica
  const gi = gateIncidenciaCritica(obra, to);
  if (gi) results.push(gi);

  // 3. Reapertura requiere rol
  if (from === 'CANCELADA' && to === 'REVISION_TECNICA' && !isOverrideRole) {
    results.push(gate('ROL_REAPERTURA', false,
      'Solo Admin o Jefe de Instalaciones puede reabrir obras canceladas'));
  }

  // 4. Gates específicos
  const fns = GATES[`${from}→${to}`] || [];
  for (const fn of fns) results.push(fn(obra, { userId, nota }));

  // 5. Gates de cancelación
  if (to === 'CANCELADA') {
    for (const fn of (GATES['ANY→CANCELADA'] || [])) results.push(fn(obra, { userId, nota }));
  }

  const failed = results.filter(r => !r.passed);
  return {
    allowed: failed.length === 0,
    isOverride: false,
    gates: results,
    reasons: failed.map(r => r.reason!).filter(Boolean),
    actions: failed.map(r => r.action!).filter(Boolean),
    obra,
  };
}

// ═══════════════════════════════════════════
// evaluateCheckinTransition — con query directa de jornada cruzada
// ═══════════════════════════════════════════

export async function evaluateCheckinTransition(
  obraId: string,
  instaladorId: string,
  instaladorNombre: string,
): Promise<TransitionResult & { obra: ObraConDatos }> {
  const obra = await cargarObraCompleta(obraId);
  if (!obra) throw new Error('Obra no encontrada');

  // Si no es PROGRAMADA, solo reportar si se puede hacer checkin
  if (obra.estado !== 'PROGRAMADA') {
    const ok = obra.estado === 'INSTALANDO'
      || obra.estado === 'VALIDACION_OPERATIVA'
      || obra.estado === 'REVISION_COORDINADOR';
    return {
      allowed: ok, isOverride: false,
      gates: ok ? [] : [gate('ESTADO_VALIDO', false, `No se puede hacer check-in en estado ${obra.estado}`)],
      reasons: ok ? [] : [`No se puede hacer check-in en estado ${obra.estado}`],
      actions: [], obra,
    };
  }

  // PROGRAMADA → evaluar gates para transicionar a INSTALANDO
  const results: GateResult[] = [];

  // Fecha tolerancia
  if (obra.fechaProgramada) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const prog = new Date(obra.fechaProgramada); prog.setHours(0, 0, 0, 0);
    const diff = Math.abs(hoy.getTime() - prog.getTime()) / 86_400_000;
    results.push(gate('FECHA_TOLERANCIA', diff <= TOLERANCIA_DIAS,
      `Obra programada para ${prog.toLocaleDateString('es-ES')}, no para hoy`,
      { type: 'INFO', label: 'Contactar coordinación' }));
  }

  // Jornada abierta en OTRA obra (query directa)
  const jornadaOtra = await prisma.checkin.findFirst({
    where: { instaladorId, horaSalida: null, obraId: { not: obraId } },
    include: { obra: { select: { codigo: true } } },
  });
  results.push(jornadaOtra
    ? gate('INSTALADOR_SIN_JORNADA_OTRA_OBRA', false,
        `${instaladorNombre} tiene jornada activa en obra ${jornadaOtra.obra.codigo}`,
        { type: 'NAVIGATE', target: '/campo/checkin', label: 'Cerrar jornada anterior' })
    : gate('INSTALADOR_SIN_JORNADA_OTRA_OBRA', true));

  // Incidencia crítica
  const gi = gateIncidenciaCritica(obra, 'INSTALANDO');
  if (gi) results.push(gi);

  const failed = results.filter(r => !r.passed);
  return {
    allowed: failed.length === 0, isOverride: false,
    gates: results,
    reasons: failed.map(r => r.reason!).filter(Boolean),
    actions: failed.map(r => r.action!).filter(Boolean),
    obra,
  };
}

// ═══════════════════════════════════════════
// executeTransition — ÚNICO punto de escritura de estado
// Override requiere: flag explícito + rol + nota >= 10
// ═══════════════════════════════════════════

export async function executeTransition(
  obraId: string,
  to: EstadoObra,
  userId: string,
  userRol: Rol,
  nota?: string,
  override?: boolean,
): Promise<
  | { ok: true; obra: any; transicionesDisponibles: EstadoObra[] }
  | { ok: false; result: TransitionResult }
> {
  // ── Override: requiere flag EXPLÍCITO + rol + motivo ──
  const isOverrideRole = ROLES_OVERRIDE.includes(userRol);
  const overrideRequested = override === true;
  const esOverride = isOverrideRole && overrideRequested;

  if (overrideRequested && !isOverrideRole) {
    return { ok: false, result: {
      allowed: false, isOverride: false,
      gates: [gate('ROL_OVERRIDE', false, 'No tiene permisos para hacer override')],
      reasons: ['No tiene permisos para hacer override'], actions: [],
    }};
  }

  if (esOverride && (!nota || nota.trim().length < 10)) {
    return { ok: false, result: {
      allowed: false, isOverride: false,
      gates: [gate('OVERRIDE_MOTIVO', false,
        'Override requiere motivo obligatorio (mín. 10 caracteres)',
        { type: 'INPUT', field: 'nota', label: 'Escribir motivo del override' })],
      reasons: ['Override requiere motivo obligatorio (mín. 10 caracteres)'],
      actions: [{ type: 'INPUT', field: 'nota', label: 'Escribir motivo del override' }],
    }};
  }

  // ── Evaluar gates ──
  const evaluation = await evaluateTransition(obraId, to, userId, userRol, nota);
  const obra = evaluation.obra;
  const from = obra.estado;

  if (!evaluation.allowed && !esOverride) {
    await prisma.actividad.create({
      data: {
        obraId, usuarioId: userId,
        accion: 'TRANSICION_RECHAZADA', entidad: 'obra', entidadId: obraId,
        detalle: JSON.stringify({ estadoActual: from, estadoIntentado: to, reasons: evaluation.reasons }),
      },
    });
    return { ok: false, result: evaluation };
  }

  // ── Ejecutar ──
  const updateData: Record<string, any> = { estado: to };
  if (to === 'INSTALANDO' && !obra.fechaInicio) updateData.fechaInicio = new Date();
  if (to === 'LEGALIZACION') updateData.fechaFin = new Date();
  if (to === 'VALIDACION_OPERATIVA' || to === 'REVISION_COORDINADOR') updateData.fechaValidacion = new Date();
  if (to === 'LEGALIZADA') updateData.fechaLegalizacion = new Date();

  const obraActualizada = await prisma.obra.update({ where: { id: obraId, version: obra.version }, data: { ...updateData, version: { increment: 1 } } });

  // ── Auditoría: cambio de estado (via registrarEvento HMAC más abajo) ──

  // ── Auditoría + notificación de override ──
  if (esOverride) {
    const gatesFallidos = evaluation.gates.filter(g => !g.passed);
    await prisma.actividad.create({
      data: {
        obraId, usuarioId: userId,
        accion: 'OVERRIDE_ESTADO', entidad: 'obra', entidadId: obraId,
        detalle: JSON.stringify({
          estadoAnterior: from, nuevoEstado: to, motivoOverride: nota,
          gatesFallidos: gatesFallidos.map(g => ({ gate: g.gate, reason: g.reason })),
        }),
      },
    });
    try {
      await notificaciones.crearParaRol('ADMIN', {
        titulo: `⚠️ Override en ${obra.codigo}`,
        mensaje: `Override ${from}→${to}. Motivo: ${nota}`,
        severidad: 'CRITICAL', tipo: 'OVERRIDE_ESTADO',
        enlace: '/obras', entidadTipo: 'obra', entidadId: obraId,
      });
    } catch (e) { logger.error('error_notif_override', { obraId, error: e }); }
  }

  // ── Notificación de cambio de estado ──
  try {
    const ids = obra.instaladores.map(i => i.instaladorId);
    await notificaciones.notificarCambiEstadoObra(obraId, obra.codigo, to, ids);
  } catch (e) { logger.error('error_notif_estado', { obraId, error: e }); }

  // ── Recalcular flag incidencia ──
  const criticas = await prisma.incidencia.count({
    where: { obraId, gravedad: 'CRITICA', estado: { in: ['ABIERTA', 'EN_PROCESO'] } },
  });
  await prisma.obra.update({ where: { id: obraId }, data: { tieneIncidenciaCritica: criticas > 0 } });

  // Registrar en cadena HMAC
  await registrarEvento({
    obraId: obra.id,
    usuarioId: userId,
    accion: 'ESTADO_CAMBIADO',
    entidad: 'obra',
    entidadId: obra.id,
    detalle: {
      estadoAnterior: from,
      nuevoEstado: to,
      nota,
      override: esOverride || undefined,
    },
  });

  logger.info('estado_obra_cambiado', {
    codigo: obra.codigo, de: from, a: to,
    usuario: userId, override: esOverride,
  });

  return { ok: true, obra: obraActualizada, transicionesDisponibles: getTransicionesDisponibles(to, userRol) };
}

// ═══════════════════════════════════════════
// UTILIDADES PÚBLICAS
// ═══════════════════════════════════════════

export function getTransicionesDisponibles(estado: EstadoObra, rol: Rol): EstadoObra[] {
  const normales = TRANSICIONES_VALIDAS[estado] || [];
  if (ROLES_OVERRIDE.includes(rol)) {
    const todos = Object.values(TRANSICIONES_VALIDAS).flat();
    return Array.from(new Set(todos)).filter(e => e !== estado) as EstadoObra[];
  }
  return normales;
}

export const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  REVISION_TECNICA:      { label: 'Revisión técnica',     color: 'purple', icon: '🔍' },
  PREPARANDO:            { label: 'Preparando',           color: 'blue',   icon: '📋' },
  PENDIENTE_MATERIAL:    { label: 'Pte. Material',        color: 'amber',  icon: '📦' },
  PROGRAMADA:            { label: 'Programada',           color: 'blue',   icon: '📅' },
  INSTALANDO:            { label: 'Instalando',           color: 'amber',  icon: '⚡' },
  VALIDACION_OPERATIVA:  { label: 'Validación operativa', color: 'purple', icon: '✅' },
  REVISION_COORDINADOR:  { label: 'Revisión coordinador', color: 'purple', icon: '👷' },
  LEGALIZACION:          { label: 'Legalización',         color: 'blue',   icon: '📋' },
  LEGALIZADA:            { label: 'Legalizada',           color: 'green',  icon: '✅' },
  COMPLETADA:            { label: 'Completada',           color: 'green',  icon: '🏆' },
  CANCELADA:             { label: 'Cancelada',            color: 'red',    icon: '❌' },
};
