// src/services/obras.service.ts
// ═══════════════════════════════════════════
// SERVICIO DE OBRAS — Lógica de negocio
// Sprint 1: Nuevo flujo con VALIDACION_OPERATIVA + REVISION_COORDINADOR
// INCIDENCIA eliminado como estado (ahora es paralelo)
// Override por ADMIN y JEFE_INSTALACIONES
// ═══════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { generarCodigoObra } from '@/lib/api';
import logger from '@/lib/logger';
import type { EstadoObra, TipoInstalacion, Rol } from '@prisma/client';

// ── Tipos ──
export interface CrearObraInput {
  clienteId: string;
  tipo: TipoInstalacion;
  direccionInstalacion?: string;
  localidad?: string;
  provincia?: string;
  potenciaKwp?: number;
  numPaneles?: number;
  inversor?: string;
  bateriaKwh?: number;
  presupuestoTotal: number; // En céntimos
  comercialId?: string;
  instaladorIds?: string[];
  notas?: string;
}

export interface FiltrosObra {
  estado?: EstadoObra;
  tipo?: TipoInstalacion;
  comercialId?: string;
  instaladorId?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

// ═══════════════════════════════════════════
// NUEVO FLUJO DE ESTADOS (Sprint 1)
// ═══════════════════════════════════════════
// REVISION_TECNICA → PREPARANDO → PENDIENTE_MATERIAL → PROGRAMADA →
// INSTALANDO → VALIDACION_OPERATIVA → REVISION_COORDINADOR →
// TERMINADA → LEGALIZACION → LEGALIZADA → COMPLETADA
//
// INCIDENCIA ya NO es un estado. Las incidencias son paralelas.
// Si hay incidencia CRITICA → flag tieneIncidenciaCritica bloquea ciertas transiciones.
//
// Override: ADMIN y JEFE_INSTALACIONES pueden saltar reglas.
// ═══════════════════════════════════════════

const TRANSICIONES_VALIDAS: Record<EstadoObra, EstadoObra[]> = {
  REVISION_TECNICA: ['PREPARANDO', 'CANCELADA'],
  PREPARANDO: ['PENDIENTE_MATERIAL', 'PROGRAMADA', 'CANCELADA'],
  PENDIENTE_MATERIAL: ['PREPARANDO', 'PROGRAMADA', 'CANCELADA'],
  PROGRAMADA: ['INSTALANDO', 'PREPARANDO', 'CANCELADA'],
  INSTALANDO: ['VALIDACION_OPERATIVA', 'CANCELADA'],
  VALIDACION_OPERATIVA: ['REVISION_COORDINADOR', 'INSTALANDO'], // Puede volver a INSTALANDO si falla
  REVISION_COORDINADOR: ['TERMINADA', 'INSTALANDO'], // Coordinador aprueba o devuelve
  TERMINADA: ['LEGALIZACION', 'CANCELADA'],
  LEGALIZACION: ['LEGALIZADA'],
  LEGALIZADA: ['COMPLETADA'],
  COMPLETADA: [],
  CANCELADA: ['REVISION_TECNICA'], // Se puede reabrir
};

// Roles que pueden hacer override de las reglas de transición
const ROLES_OVERRIDE: Rol[] = ['ADMIN', 'JEFE_INSTALACIONES'];

// Labels para estados
export const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  REVISION_TECNICA:      { label: 'Revisión técnica',     color: 'purple', icon: '🔍' },
  PREPARANDO:            { label: 'Preparando',           color: 'blue',   icon: '📋' },
  PENDIENTE_MATERIAL:    { label: 'Pte. Material',        color: 'amber',  icon: '📦' },
  PROGRAMADA:            { label: 'Programada',           color: 'blue',   icon: '📅' },
  INSTALANDO:            { label: 'Instalando',           color: 'amber',  icon: '⚡' },
  VALIDACION_OPERATIVA:  { label: 'Validación operativa', color: 'purple', icon: '✅' },
  REVISION_COORDINADOR:  { label: 'Revisión coordinador', color: 'purple', icon: '👷' },
  TERMINADA:             { label: 'Terminada',            color: 'green',  icon: '✅' },
  LEGALIZACION:          { label: 'Legalización',         color: 'blue',   icon: '📋' },
  LEGALIZADA:            { label: 'Legalizada',           color: 'green',  icon: '✅' },
  COMPLETADA:            { label: 'Completada',           color: 'green',  icon: '🏆' },
  CANCELADA:             { label: 'Cancelada',            color: 'red',    icon: '❌' },
};

// ── Listar obras con filtros ──
export async function listarObras(filtros: FiltrosObra, rolUsuario: Rol, usuarioId: string) {
  const { estado, tipo, comercialId, instaladorId, busqueda, page = 1, limit = 50 } = filtros;

  const where: any = { deletedAt: null };

  // Filtro por rol: instaladores solo ven sus obras
  if (rolUsuario === 'INSTALADOR') {
    where.instaladores = { some: { instaladorId: usuarioId } };
  }
  if (rolUsuario === 'COMERCIAL') {
    where.comercialId = usuarioId;
  }

  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;
  if (comercialId) where.comercialId = comercialId;
  if (instaladorId) {
    where.instaladores = { some: { instaladorId } };
  }
  if (busqueda) {
    where.OR = [
      { codigo: { contains: busqueda, mode: 'insensitive' } },
      { cliente: { nombre: { contains: busqueda, mode: 'insensitive' } } },
      { cliente: { apellidos: { contains: busqueda, mode: 'insensitive' } } },
    ];
  }

  const [obras, total] = await Promise.all([
    prisma.obra.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, apellidos: true, telefono: true } },
        comercial: { select: { id: true, nombre: true, apellidos: true } },
        instaladores: {
          include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
        },
        _count: { select: { incidencias: { where: { estado: 'ABIERTA' } }, pagos: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.obra.count({ where }),
  ]);

  // Calcular % cobrado
  const obrasConCobro = await Promise.all(
    obras.map(async (obra) => {
      const totalPagado = await prisma.pago.aggregate({
        where: { obraId: obra.id },
        _sum: { importe: true },
      });
      const cobrado = totalPagado._sum.importe || 0;
      const porcentajeCobro = obra.presupuestoTotal > 0
        ? Math.round((cobrado / obra.presupuestoTotal) * 100)
        : 0;
      return { ...obra, cobrado, porcentajeCobro };
    })
  );

  return { obras: obrasConCobro, total, page, limit };
}

// ── Detalle de una obra ──
export async function detalleObra(obraId: string) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      cliente: true,
      comercial: { select: { id: true, nombre: true, apellidos: true, email: true } },
      instaladores: {
        include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
      },
      planPagos: { orderBy: { orden: 'asc' } },
      pagos: { orderBy: { fechaCobro: 'desc' }, include: { registradoPor: { select: { nombre: true } } } },
      incidencias: { orderBy: { createdAt: 'desc' } },
      checkins: { orderBy: { horaEntrada: 'desc' }, take: 10 },
      validaciones: { orderBy: { createdAt: 'desc' }, take: 1 },
      checklistValidaciones: { orderBy: { createdAt: 'desc' }, take: 1, include: { items: true } },
      documentos: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      actividades: { orderBy: { createdAt: 'desc' }, take: 30, include: { usuario: { select: { nombre: true } } } },
      gastos: { orderBy: { createdAt: 'desc' } },
      activos: { orderBy: { createdAt: 'desc' } },
      subvenciones: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!obra) return null;

  const totalCobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
  const totalGastos = obra.gastos.reduce((sum, g) => sum + g.importe, 0);

  // Transiciones disponibles (sin override — eso se maneja en cambiarEstado)
  const transicionesDisponibles = TRANSICIONES_VALIDAS[obra.estado] || [];

  return {
    ...obra,
    totalCobrado,
    totalGastos,
    pendiente: obra.presupuestoTotal - totalCobrado,
    porcentajeCobro: obra.presupuestoTotal > 0
      ? Math.round((totalCobrado / obra.presupuestoTotal) * 100)
      : 0,
    margen: obra.presupuestoTotal > 0
      ? Math.round(((obra.presupuestoTotal - obra.costeTotal) / obra.presupuestoTotal) * 100)
      : 0,
    transicionesDisponibles,
    incidenciasAbiertas: obra.incidencias.filter(i => i.estado === 'ABIERTA' || i.estado === 'EN_PROCESO').length,
  };
}

// ── Crear obra ──
export async function crearObra(input: CrearObraInput, usuarioId: string) {
  const codigo = await generarCodigoObra();

  const obra = await prisma.obra.create({
    data: {
      codigo,
      clienteId: input.clienteId,
      tipo: input.tipo,
      direccionInstalacion: input.direccionInstalacion,
      localidad: input.localidad,
      provincia: input.provincia,
      potenciaKwp: input.potenciaKwp,
      numPaneles: input.numPaneles,
      inversor: input.inversor,
      bateriaKwh: input.bateriaKwh,
      presupuestoTotal: input.presupuestoTotal,
      comercialId: input.comercialId,
      notas: input.notas,
    },
  });

  // Asignar instaladores si se proporcionan
  if (input.instaladorIds && input.instaladorIds.length > 0) {
    await prisma.obraInstalador.createMany({
      data: input.instaladorIds.map((instaladorId, i) => ({
        obraId: obra.id,
        instaladorId,
        esJefe: i === 0, // El primero es jefe
      })),
    });
  }

  await prisma.actividad.create({
    data: {
      obraId: obra.id,
      usuarioId,
      accion: 'OBRA_CREADA',
      entidad: 'obra',
      entidadId: obra.id,
      detalle: JSON.stringify({ codigo: obra.codigo, tipo: obra.tipo }),
    },
  });

  logger.info('obra_creada', { codigo: obra.codigo, usuario: usuarioId });
  return obra;
}

// ── Cambiar estado — con prerequisitos y override ──
export async function cambiarEstadoObra(
  obraId: string,
  nuevoEstado: EstadoObra,
  usuarioId: string,
  rolUsuario: Rol,
  nota?: string,
  override?: boolean
) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    include: {
      incidencias: { where: { estado: { in: ['ABIERTA', 'EN_PROCESO'] } } },
      pagos: true,
      checklistValidaciones: { where: { resultado: { not: 'BORRADOR' } }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!obra) throw new Error('Obra no encontrada');

  // Verificar si es override autorizado
  const esOverride = override && ROLES_OVERRIDE.includes(rolUsuario);

  // Verificar transición válida (a menos que sea override)
  if (!esOverride) {
    const transicionesPermitidas = TRANSICIONES_VALIDAS[obra.estado];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw new Error(
        `Transición no válida: ${obra.estado} → ${nuevoEstado}. Permitidas: ${transicionesPermitidas.join(', ')}`
      );
    }

    // ── Prerequisitos por estado ──
    const errores: string[] = [];

    // Bloqueo si tiene incidencia crítica (excepto para CANCELADA)
    if (obra.tieneIncidenciaCritica && nuevoEstado !== 'CANCELADA' && nuevoEstado !== 'INSTALANDO') {
      const criticas = obra.incidencias.filter(i => i.gravedad === 'CRITICA');
      if (criticas.length > 0) {
        errores.push(`Hay ${criticas.length} incidencia(s) CRÍTICA(s) sin resolver`);
      }
    }

    // TERMINADA → LEGALIZACION: requiere validación OK
    if (nuevoEstado === 'LEGALIZACION') {
      const ultimaValidacion = obra.checklistValidaciones[0];
      if (!ultimaValidacion || ultimaValidacion.resultado !== 'OK') {
        errores.push('Se requiere validación técnica aprobada (OK) antes de legalizar');
      }
      // Verificar anticipo cobrado (≥40%)
      const totalPagado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
      const porcentajeCobro = obra.presupuestoTotal > 0 ? (totalPagado / obra.presupuestoTotal) * 100 : 0;
      if (porcentajeCobro < 40) {
        errores.push(`Se requiere al menos 40% cobrado para legalizar (actual: ${Math.round(porcentajeCobro)}%)`);
      }
    }

    // LEGALIZADA → COMPLETADA: requiere 100% cobrado
    if (nuevoEstado === 'COMPLETADA') {
      const totalPagado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
      if (totalPagado < obra.presupuestoTotal) {
        errores.push(`Se requiere cobro completo para completar (pendiente: ${((obra.presupuestoTotal - totalPagado) / 100).toFixed(2)}€)`);
      }
    }

    if (errores.length > 0) {
      throw new Error(`No se puede cambiar a ${nuevoEstado}: ${errores.join('. ')}`);
    }
  }

  const estadoAnterior = obra.estado;

  // Actualizar estado + fechas relevantes
  const updateData: any = { estado: nuevoEstado };
  if (nuevoEstado === 'INSTALANDO' && !obra.fechaInicio) updateData.fechaInicio = new Date();
  if (nuevoEstado === 'TERMINADA') updateData.fechaFin = new Date();
  if (nuevoEstado === 'VALIDACION_OPERATIVA' || nuevoEstado === 'REVISION_COORDINADOR') {
    updateData.fechaValidacion = new Date();
  }

  const obraActualizada = await prisma.obra.update({
    where: { id: obraId },
    data: updateData,
  });

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: obra.id,
      usuarioId,
      accion: 'ESTADO_CAMBIADO',
      entidad: 'obra',
      entidadId: obra.id,
      detalle: JSON.stringify({
        estadoAnterior,
        nuevoEstado,
        nota,
        override: esOverride || undefined,
      }),
    },
  });

  logger.info('estado_obra_cambiado', {
    codigo: obra.codigo,
    de: estadoAnterior,
    a: nuevoEstado,
    usuario: usuarioId,
    override: esOverride,
  });

  return obraActualizada;
}

// ── Asignar instaladores a obra ──
export async function asignarInstaladores(
  obraId: string,
  instaladorIds: string[],
  usuarioId: string
) {
  // Eliminar asignaciones actuales
  await prisma.obraInstalador.deleteMany({ where: { obraId } });

  // Crear nuevas
  if (instaladorIds.length > 0) {
    await prisma.obraInstalador.createMany({
      data: instaladorIds.map((instaladorId, i) => ({
        obraId,
        instaladorId,
        esJefe: i === 0,
      })),
    });
  }

  await prisma.actividad.create({
    data: {
      obraId,
      usuarioId,
      accion: 'INSTALADORES_ASIGNADOS',
      entidad: 'obra',
      entidadId: obraId,
      detalle: JSON.stringify({ instaladorIds }),
    },
  });

  logger.info('instaladores_asignados', { obraId, instaladorIds, usuario: usuarioId });
}

// ── Obtener transiciones disponibles para una obra (incluye override) ──
export function getTransicionesDisponibles(estadoActual: EstadoObra, rolUsuario: Rol): EstadoObra[] {
  const normales = TRANSICIONES_VALIDAS[estadoActual] || [];

  // Si el rol puede hacer override, mostrar todos los estados posibles
  if (ROLES_OVERRIDE.includes(rolUsuario)) {
    const todos = Object.values(TRANSICIONES_VALIDAS).flat();
    const unicos = Array.from(new Set(todos)).filter(e => e !== estadoActual);
    return unicos as EstadoObra[];
  }

  return normales;
}

// ── Contadores por estado (para dashboard) ──
export async function contadoresPorEstado() {
  const contadores = await prisma.obra.groupBy({
    by: ['estado'],
    where: { deletedAt: null },
    _count: { id: true },
  });

  return contadores.reduce(
    (acc, c) => ({ ...acc, [c.estado]: c._count.id }),
    {} as Record<string, number>
  );
}

// ── Actualizar flag de incidencia crítica ──
export async function recalcularFlagIncidenciaCritica(obraId: string) {
  const incidenciasCriticas = await prisma.incidencia.count({
    where: {
      obraId,
      gravedad: 'CRITICA',
      estado: { in: ['ABIERTA', 'EN_PROCESO'] },
    },
  });

  await prisma.obra.update({
    where: { id: obraId },
    data: { tieneIncidenciaCritica: incidenciasCriticas > 0 },
  });
}
