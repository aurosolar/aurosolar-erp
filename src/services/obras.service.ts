// src/services/obras.service.ts
// ═══════════════════════════════════════════════
// SERVICIO DE OBRAS — Lógica de negocio
// v2: TERMINADA eliminado. Transiciones delegadas a gate-engine.
// ═══════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { generarCodigoObra } from '@/lib/api';
import logger from '@/lib/logger';
import type { EstadoObra, TipoInstalacion, Rol } from '@prisma/client';
import {
  TRANSICIONES_VALIDAS,
  ESTADO_CONFIG,
  getTransicionesDisponibles,
  executeTransition,
} from '@/services/gate-engine';

// Re-export para que consumidores existentes no rompan
export { ESTADO_CONFIG, TRANSICIONES_VALIDAS, getTransicionesDisponibles };

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

// ── Listar obras con paginación ──
export async function listarObras(filtros: FiltrosObra = {}) {
  const { estado, tipo, comercialId, instaladorId, busqueda, page = 1, limit = 50 } = filtros;

  const where: any = { deletedAt: null };
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
      { direccionInstalacion: { contains: busqueda, mode: 'insensitive' } },
    ];
  }

  const [obras, total] = await Promise.all([
    prisma.obra.findMany({
      where,
      include: {
        cliente: { select: { nombre: true, apellidos: true, telefono: true } },
        comercial: { select: { nombre: true, apellidos: true } },
        instaladores: {
          include: { instalador: { select: { nombre: true, apellidos: true } } },
        },
        pagos: { select: { importe: true } },
        _count: { select: { incidencias: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.obra.count({ where }),
  ]);

  const obrasConCobro = await Promise.all(
    obras.map(async (obra) => {
      const cobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
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
      checklistValidaciones: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          items: true,
          submittedBy: { select: { nombre: true, apellidos: true } },
          reviewedBy: { select: { nombre: true, apellidos: true } },
        },
      },
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

  // Transiciones desde gate-engine (sin override — eso se ve en el frontend)
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

  if (input.instaladorIds && input.instaladorIds.length > 0) {
    await prisma.obraInstalador.createMany({
      data: input.instaladorIds.map((instaladorId, i) => ({
        obraId: obra.id,
        instaladorId,
        esJefe: i === 0,
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

// ═══════════════════════════════════════════════
// cambiarEstadoObra — DELEGADO A gate-engine
// ═══════════════════════════════════════════════
// TODA lógica de validación, override, y auditoría
// está ahora en executeTransition(). Esta función
// solo existe como wrapper retrocompatible.

export async function cambiarEstadoObra(
  obraId: string,
  nuevoEstado: EstadoObra,
  usuarioId: string,
  rolUsuario: Rol,
  nota?: string,
  override?: boolean,
) {
  const result = await executeTransition(obraId, nuevoEstado, usuarioId, rolUsuario, nota, override);

  if (!result.ok) {
    // Convertir formato gate-engine a throw para retrocompatibilidad
    const reasons = result.result.reasons.join('. ');
    const error = new Error(`No se puede cambiar a ${nuevoEstado}: ${reasons}`) as any;
    error.transitionResult = result.result;
    throw error;
  }

  return result.obra;
}

// ── Asignar instaladores a obra ──
export async function asignarInstaladores(
  obraId: string,
  instaladorIds: string[],
  usuarioId: string
) {
  await prisma.obraInstalador.deleteMany({ where: { obraId } });

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
