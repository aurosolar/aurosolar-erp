// src/services/subvenciones.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function listar(filtros?: { estado?: string; tipo?: string }) {
  return prisma.subvencion.findMany({
    where: {
      ...(filtros?.estado ? { estado: filtros.estado as any } : {}),
      ...(filtros?.tipo ? { tipo: filtros.tipo as any } : {}),
    },
    include: {
      obra: { select: { codigo: true, clienteId: true, cliente: { select: { nombre: true, apellidos: true } } } },
      responsable: { select: { nombre: true, apellidos: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function detalle(id: string) {
  return prisma.subvencion.findUnique({
    where: { id },
    include: {
      obra: { select: { codigo: true, tipo: true, presupuestoTotal: true, cliente: { select: { nombre: true, apellidos: true } } } },
      responsable: { select: { nombre: true, apellidos: true } },
    },
  });
}

export async function crear(input: {
  obraId: string; tipo: string; programa?: string; convocatoria?: string;
  importeSolicitado: number; fechaLimite?: string; notas?: string; responsableId?: string;
}, usuarioId: string) {
  const sub = await prisma.subvencion.create({
    data: {
      obraId: input.obraId,
      tipo: input.tipo as any,
      programa: input.programa,
      convocatoria: input.convocatoria,
      importeSolicitado: input.importeSolicitado,
      fechaLimite: input.fechaLimite ? new Date(input.fechaLimite) : undefined,
      notas: input.notas,
      responsableId: input.responsableId,
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'SUBVENCION_CREADA',
      entidad: 'subvencion',
      entidadId: sub.id,
      detalle: JSON.stringify({ tipo: input.tipo, importe: input.importeSolicitado }),
    },
  });

  logger.info('subvencion_creada', { id: sub.id, tipo: input.tipo });
  return sub;
}

export async function cambiarEstado(id: string, estado: string, datos: {
  expediente?: string; importeAprobado?: number; importeCobrado?: number;
  fechaSolicitud?: string; fechaAprobacion?: string; fechaCobro?: string; notas?: string;
}, usuarioId: string) {
  const anterior = await prisma.subvencion.findUnique({ where: { id } });
  if (!anterior) throw new Error('Subvención no encontrada');

  const sub = await prisma.subvencion.update({
    where: { id },
    data: {
      estado: estado as any,
      ...(datos.expediente ? { expediente: datos.expediente } : {}),
      ...(datos.importeAprobado !== undefined ? { importeAprobado: datos.importeAprobado } : {}),
      ...(datos.importeCobrado !== undefined ? { importeCobrado: datos.importeCobrado } : {}),
      ...(datos.fechaSolicitud ? { fechaSolicitud: new Date(datos.fechaSolicitud) } : {}),
      ...(datos.fechaAprobacion ? { fechaAprobacion: new Date(datos.fechaAprobacion) } : {}),
      ...(datos.fechaCobro ? { fechaCobro: new Date(datos.fechaCobro) } : {}),
      ...(datos.notas !== undefined ? { notas: datos.notas } : {}),
    },
  });

  await prisma.actividad.create({
    data: {
      obraId: anterior.obraId,
      usuarioId,
      accion: 'SUBVENCION_ESTADO',
      entidad: 'subvencion',
      entidadId: id,
      detalle: JSON.stringify({ estado_anterior: anterior.estado, estado_nuevo: estado }),
    },
  });

  return sub;
}

export async function resumen() {
  const hoy = new Date();
  const [total, porEstado, importeTotal, proximasACaducar] = await Promise.all([
    prisma.subvencion.count(),
    prisma.subvencion.groupBy({ by: ['estado'], _count: true }),
    prisma.subvencion.aggregate({
      _sum: { importeSolicitado: true, importeAprobado: true, importeCobrado: true },
    }),
    prisma.subvencion.count({
      where: {
        estado: { in: ['SOLICITADA', 'EN_TRAMITE', 'APROBADA'] },
        fechaLimite: { lte: new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    total,
    porEstado: porEstado.map(e => ({ estado: e.estado, count: e._count })),
    importeSolicitado: importeTotal._sum.importeSolicitado || 0,
    importeAprobado: importeTotal._sum.importeAprobado || 0,
    importeCobrado: importeTotal._sum.importeCobrado || 0,
    proximasACaducar,
  };
}
