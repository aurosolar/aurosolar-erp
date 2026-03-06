// src/services/legalizacion.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const TRANSICIONES_LEGAL: Record<string, string[]> = {
  PENDIENTE: ['SOLICITADA'],
  SOLICITADA: ['EN_TRAMITE'],
  EN_TRAMITE: ['APROBADA'],
  APROBADA: ['INSCRITA'],
};

export async function listarLegalizaciones(filtros?: { estado?: string }) {
  const where: any = {
    deletedAt: null,
    estado: { in: ['REVISION_COORDINADOR', 'LEGALIZACION'] },
    estadoLegalizacion: { not: 'NO_APLICA' },
  };
  if (filtros?.estado) where.estadoLegalizacion = filtros.estado as any;

  const obras = await prisma.obra.findMany({
    where,
    include: {
      cliente: { select: { nombre: true, apellidos: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return obras.map(o => {
    const diasEnEstado = Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / 86400000);
    return {
      id: o.id,
      codigo: o.codigo,
      cliente: `${o.cliente.nombre} ${o.cliente.apellidos}`,
      tipo: o.tipo,
      estadoLegal: o.estadoLegalizacion,
      expediente: o.expedienteLegal,
      localidad: o.localidad,
      potencia: o.potenciaKwp,
      diasEnEstado,
      alerta: diasEnEstado > 30,
      updatedAt: o.updatedAt,
    };
  });
}

export async function avanzarLegalizacion(obraId: string, nuevoEstado: string, usuarioId: string, datos?: {
  expediente?: string; notas?: string;
}) {
  const obra = await prisma.obra.findUnique({ where: { id: obraId } });
  if (!obra) throw new Error('Obra no encontrada');

  const permitidos = TRANSICIONES_LEGAL[obra.estadoLegalizacion] || [];
  if (!permitidos.includes(nuevoEstado)) {
    throw new Error(`No se puede pasar de ${obra.estadoLegalizacion} a ${nuevoEstado}`);
  }

  const updateData: any = { estadoLegalizacion: nuevoEstado as any };
  if (datos?.expediente) updateData.expedienteLegal = datos.expediente;

  // Si pasa a INSCRITA, mover obra a LEGALIZACION si no está ya
  if (nuevoEstado === 'INSCRITA' && obra.estado === 'REVISION_COORDINADOR') {
    updateData.estado = 'LEGALIZACION';
  }

  await prisma.obra.update({ where: { id: obraId }, data: updateData });

  await prisma.actividad.create({
    data: {
      obraId,
      usuarioId,
      accion: `LEGAL_${nuevoEstado}`,
      entidad: 'obra',
      entidadId: obraId,
      detalle: JSON.stringify({ de: obra.estadoLegalizacion, a: nuevoEstado, ...datos }),
    },
  });

  logger.info('legalizacion_avanzada', { obraId, de: obra.estadoLegalizacion, a: nuevoEstado });
  return { ok: true };
}

export async function resumenLegalizacion() {
  const obras = await prisma.obra.findMany({
    where: { deletedAt: null, estadoLegalizacion: { not: 'NO_APLICA' } },
    select: { estadoLegalizacion: true, updatedAt: true },
  });

  const conteo: Record<string, number> = {};
  let alertas = 0;
  for (const o of obras) {
    conteo[o.estadoLegalizacion] = (conteo[o.estadoLegalizacion] || 0) + 1;
    const dias = Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / 86400000);
    if (dias > 30 && !['INSCRITA', 'NO_APLICA', 'PENDIENTE'].includes(o.estadoLegalizacion)) alertas++;
  }

  return { conteo, alertas, total: obras.length };
}
