// src/services/obras.service.ts
// ═══════════════════════════════════════════
// SERVICIO DE OBRAS — Lógica de negocio
// REGLA: Toda lógica de negocio vive en /services/
// Ni en API Routes, ni en componentes, ni en middleware.
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
  notas?: string;
}

export interface FiltrosObra {
  estado?: EstadoObra;
  tipo?: TipoInstalacion;
  comercialId?: string;
  instaladorId?: string;
  busqueda?: string; // Código o nombre cliente
  page?: number;
  limit?: number;
}

// ── Transiciones de estado válidas ──
const TRANSICIONES_VALIDAS: Record<EstadoObra, EstadoObra[]> = {
  REVISION_TECNICA: ['PREPARANDO', 'CANCELADA'],
  PREPARANDO: ['PENDIENTE_MATERIAL', 'PROGRAMADA', 'CANCELADA'],
  PENDIENTE_MATERIAL: ['PREPARANDO', 'PROGRAMADA', 'CANCELADA'],
  PROGRAMADA: ['INSTALANDO', 'PREPARANDO', 'CANCELADA'],
  INSTALANDO: ['TERMINADA', 'INCIDENCIA'],
  TERMINADA: ['LEGALIZACION', 'INCIDENCIA'],
  INCIDENCIA: ['INSTALANDO', 'TERMINADA', 'PROGRAMADA'],
  LEGALIZACION: ['LEGALIZADA', 'INCIDENCIA'],
  LEGALIZADA: ['COMPLETADA'],
  COMPLETADA: [],
  CANCELADA: ['REVISION_TECNICA'], // Se puede reabrir
};

// ── Listar obras con filtros ──
export async function listarObras(filtros: FiltrosObra, rolUsuario: Rol, usuarioId: string) {
  const { estado, tipo, comercialId, instaladorId, busqueda, page = 1, limit = 50 } = filtros;

  const where: any = { deletedAt: null };

  // Filtro por rol: instaladores solo ven sus obras
  if (rolUsuario === 'INSTALADOR') {
    where.instaladores = { some: { instaladorId: usuarioId } };
  }
  // Comerciales solo ven sus obras
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

  // Calcular % cobrado para cada obra
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
      documentos: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      actividades: { orderBy: { createdAt: 'desc' }, take: 20, include: { usuario: { select: { nombre: true } } } },
      gastos: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!obra) return null;

  // Calcular totales
  const totalCobrado = obra.pagos.reduce((sum, p) => sum + p.importe, 0);
  const totalGastos = obra.gastos.reduce((sum, g) => sum + g.importe, 0);

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

  // Registrar actividad
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

// ── Cambiar estado ──
export async function cambiarEstadoObra(
  obraId: string,
  nuevoEstado: EstadoObra,
  usuarioId: string,
  nota?: string
) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) throw new Error('Obra no encontrada');

  const transicionesPermitidas = TRANSICIONES_VALIDAS[obra.estado];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new Error(
      `Transición no válida: ${obra.estado} → ${nuevoEstado}. Permitidas: ${transicionesPermitidas.join(', ')}`
    );
  }

  const estadoAnterior = obra.estado;

  // Actualizar estado + fechas relevantes
  const updateData: any = { estado: nuevoEstado };
  if (nuevoEstado === 'INSTALANDO' && !obra.fechaInicio) updateData.fechaInicio = new Date();
  if (nuevoEstado === 'TERMINADA') updateData.fechaFin = new Date();

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
      detalle: JSON.stringify({ estadoAnterior, nuevoEstado, nota }),
    },
  });

  logger.info('estado_obra_cambiado', {
    codigo: obra.codigo,
    de: estadoAnterior,
    a: nuevoEstado,
    usuario: usuarioId,
  });

  return obraActualizada;
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
