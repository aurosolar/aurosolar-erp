// src/services/comisiones.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function listar(filtros?: { estado?: string }) {
  return prisma.comision.findMany({
    where: filtros?.estado ? { estado: filtros.estado } : {},
    include: {
      obra: {
        select: {
          codigo: true, tipo: true, presupuestoTotal: true, estado: true,
          cliente: { select: { nombre: true, apellidos: true } },
          pagos: { select: { importe: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function resumen() {
  const [total, pendientes, pagadas, importePendiente, importePagado] = await Promise.all([
    prisma.comision.count(),
    prisma.comision.count({ where: { estado: 'PENDIENTE' } }),
    prisma.comision.count({ where: { estado: 'PAGADA' } }),
    prisma.comision.aggregate({ where: { estado: 'PENDIENTE' }, _sum: { importe: true } }),
    prisma.comision.aggregate({ where: { estado: 'PAGADA' }, _sum: { importe: true } }),
  ]);
  return {
    total, pendientes, pagadas,
    importePendiente: importePendiente._sum.importe || 0,
    importePagado: importePagado._sum.importe || 0,
  };
}

export async function marcarPagada(id: string, usuarioId: string) {
  const com = await prisma.comision.update({
    where: { id },
    data: { estado: 'PAGADA' },
  });
  await prisma.actividad.create({
    data: {
      obraId: com.obraId,
      usuarioId,
      accion: 'COMISION_PAGADA',
      entidad: 'comision',
      entidadId: id,
      detalle: JSON.stringify({ importe: com.importe, comercial: com.comercialEmail }),
    },
  });
  logger.info('comision_pagada', { id });
  return com;
}

export async function crearDesdeObra(obraId: string, comercialEmail: string, presupuesto: number, porcentaje: number) {
  const importe = Math.round(presupuesto * porcentaje);
  return prisma.comision.create({
    data: { obraId, comercialEmail, presupuesto, porcentaje, importe },
  });
}
