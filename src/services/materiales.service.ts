// src/services/materiales.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Listar solicitudes ──
export async function listarSolicitudes(filtros?: {
  obraId?: string; estado?: string;
}) {
  return prisma.solicitudMaterial.findMany({
    where: {
      ...(filtros?.obraId ? { obraId: filtros.obraId } : {}),
      ...(filtros?.estado ? { estado: filtros.estado as any } : {}),
    },
    include: {
      obra: { select: { codigo: true, cliente: { select: { nombre: true, apellidos: true } } } },
      lineas: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Detalle ──
export async function detalleSolicitud(id: string) {
  return prisma.solicitudMaterial.findUnique({
    where: { id },
    include: {
      obra: { select: { codigo: true, cliente: { select: { nombre: true, apellidos: true } } } },
      lineas: true,
    },
  });
}

// ── Crear solicitud con líneas ──
export async function crearSolicitud(input: {
  obraId: string;
  proveedor?: string;
  notas?: string;
  fechaEntregaPrevista?: string;
  lineas: Array<{ producto: string; cantidad: number; costeUnitario: number }>;
}, usuarioId: string) {
  const costeTotal = input.lineas.reduce((sum, l) => sum + l.cantidad * l.costeUnitario, 0);

  const solicitud = await prisma.solicitudMaterial.create({
    data: {
      obraId: input.obraId,
      estado: 'BORRADOR',
      proveedor: input.proveedor,
      notas: input.notas,
      fechaEntregaPrevista: input.fechaEntregaPrevista ? new Date(input.fechaEntregaPrevista) : null,
      costeTotal,
      lineas: {
        create: input.lineas.map(l => ({
          producto: l.producto,
          cantidad: l.cantidad,
          costeUnitario: l.costeUnitario,
        })),
      },
    },
    include: { lineas: true },
  });

  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'SOLICITUD_MATERIAL_CREADA',
      entidad: 'solicitud_material',
      entidadId: solicitud.id,
      detalle: JSON.stringify({ lineas: input.lineas.length, costeTotal }),
    },
  });

  logger.info('solicitud_material_creada', { id: solicitud.id, obraId: input.obraId });
  return solicitud;
}

// ── Cambiar estado (enviar, aprobar, rechazar, marcar pedida) ──
const TRANSICIONES: Record<string, string[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['APROBADA', 'RECHAZADA'],
  APROBADA: ['PEDIDA'],
  PEDIDA: ['RECIBIDA_PARCIAL', 'RECIBIDA'],
  RECIBIDA_PARCIAL: ['RECIBIDA'],
};

export async function cambiarEstado(id: string, nuevoEstado: string, usuarioId: string, notas?: string) {
  const solicitud = await prisma.solicitudMaterial.findUnique({ where: { id } });
  if (!solicitud) throw new Error('Solicitud no encontrada');

  const permitidos = TRANSICIONES[solicitud.estado] || [];
  if (!permitidos.includes(nuevoEstado)) {
    throw new Error(`No se puede pasar de ${solicitud.estado} a ${nuevoEstado}`);
  }

  await prisma.solicitudMaterial.update({
    where: { id },
    data: { estado: nuevoEstado as any },
  });

  await prisma.actividad.create({
    data: {
      obraId: solicitud.obraId,
      usuarioId,
      accion: `MATERIAL_${nuevoEstado}`,
      entidad: 'solicitud_material',
      entidadId: id,
      detalle: notas ? JSON.stringify({ notas }) : undefined,
    },
  });

  logger.info('material_estado', { id, de: solicitud.estado, a: nuevoEstado });
  return { ok: true };
}

// ── Actualizar recepción de líneas ──
export async function actualizarRecepcion(lineaId: string, cantidadRecibida: number) {
  return prisma.lineaMaterial.update({
    where: { id: lineaId },
    data: { recibido: cantidadRecibida },
  });
}

// ── Resumen costes por obra ──
export async function costesPorObra(obraId: string) {
  const solicitudes = await prisma.solicitudMaterial.findMany({
    where: { obraId, estado: { notIn: ['RECHAZADA'] } },
    include: { lineas: true },
  });

  let totalSolicitado = 0;
  let totalAprobado = 0;
  let totalRecibido = 0;

  for (const s of solicitudes) {
    const costeSol = s.lineas.reduce((sum, l) => sum + l.cantidad * l.costeUnitario, 0);
    totalSolicitado += costeSol;
    if (['APROBADA', 'PEDIDA', 'RECIBIDA_PARCIAL', 'RECIBIDA'].includes(s.estado)) {
      totalAprobado += costeSol;
    }
    if (['RECIBIDA_PARCIAL', 'RECIBIDA'].includes(s.estado)) {
      totalRecibido += s.lineas.reduce((sum, l) => sum + l.recibido * l.costeUnitario, 0);
    }
  }

  return {
    totalSolicitudes: solicitudes.length,
    totalSolicitado,
    totalAprobado,
    totalRecibido,
  };
}
