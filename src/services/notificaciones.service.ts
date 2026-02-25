// src/services/notificaciones.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

type Severidad = 'INFO' | 'WARNING' | 'CRITICAL';

// ── Crear notificación ──
export async function crear(input: {
  usuarioId: string;
  titulo: string;
  mensaje: string;
  severidad?: Severidad;
  tipo?: string;
  enlace?: string;
  entidadTipo?: string;
  entidadId?: string;
  expiradaAt?: Date;
}) {
  return prisma.notificacion.create({
    data: {
      usuarioId: input.usuarioId,
      titulo: input.titulo,
      mensaje: input.mensaje,
      severidad: input.severidad || 'INFO',
      tipo: input.tipo,
      enlace: input.enlace,
      entidadTipo: input.entidadTipo,
      entidadId: input.entidadId,
      expiradaAt: input.expiradaAt,
    },
  });
}

// ── Crear notificación para un rol (todos los usuarios con ese rol) ──
export async function crearParaRol(
  rol: string,
  data: Omit<Parameters<typeof crear>[0], 'usuarioId'>
) {
  const usuarios = await prisma.usuario.findMany({
    where: { rol: rol as any, activo: true },
    select: { id: true },
  });
  const notifs = [];
  for (const u of usuarios) {
    notifs.push(await crear({ ...data, usuarioId: u.id }));
  }
  logger.info('notificacion_rol', { rol, count: notifs.length, tipo: data.tipo });
  return notifs;
}

// ── Listar del usuario ──
export async function listar(usuarioId: string, soloNoLeidas = false) {
  const hoy = new Date();
  return prisma.notificacion.findMany({
    where: {
      usuarioId,
      ...(soloNoLeidas ? { leida: false } : {}),
      OR: [
        { expiradaAt: null },
        { expiradaAt: { gt: hoy } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ── Conteo no leídas ──
export async function contarNoLeidas(usuarioId: string) {
  const hoy = new Date();
  return prisma.notificacion.count({
    where: {
      usuarioId,
      leida: false,
      OR: [
        { expiradaAt: null },
        { expiradaAt: { gt: hoy } },
      ],
    },
  });
}

// ── Marcar como leída ──
export async function marcarLeida(id: string, usuarioId: string) {
  return prisma.notificacion.updateMany({
    where: { id, usuarioId },
    data: { leida: true },
  });
}

// ── Marcar todas como leídas ──
export async function marcarTodasLeidas(usuarioId: string) {
  return prisma.notificacion.updateMany({
    where: { usuarioId, leida: false },
    data: { leida: true },
  });
}

// ═══ Helpers para crear notificaciones comunes ═══

export async function notificarCambiEstadoObra(obraId: string, codigo: string, nuevoEstado: string, responsableIds: string[]) {
  for (const uid of responsableIds) {
    await crear({
      usuarioId: uid,
      titulo: `Obra ${codigo} → ${nuevoEstado}`,
      mensaje: `El estado de la obra ${codigo} ha cambiado a ${nuevoEstado}`,
      severidad: 'INFO',
      tipo: 'OBRA_ESTADO',
      enlace: `/obras`,
      entidadTipo: 'obra',
      entidadId: obraId,
    });
  }
}

export async function notificarIncidencia(obraId: string, codigo: string, severidad: string, responsableIds: string[]) {
  const sev: Severidad = severidad === 'ALTA' ? 'CRITICAL' : severidad === 'MEDIA' ? 'WARNING' : 'INFO';
  for (const uid of responsableIds) {
    await crear({
      usuarioId: uid,
      titulo: `⚠️ Incidencia en ${codigo}`,
      mensaje: `Se ha reportado una incidencia ${severidad.toLowerCase()} en la obra ${codigo}`,
      severidad: sev,
      tipo: 'INCIDENCIA',
      enlace: `/incidencias`,
      entidadTipo: 'obra',
      entidadId: obraId,
    });
  }
}

export async function notificarCobroPendiente(obraId: string, codigo: string, dias: number, responsableIds: string[]) {
  const sev: Severidad = dias > 30 ? 'CRITICAL' : dias > 15 ? 'WARNING' : 'INFO';
  for (const uid of responsableIds) {
    await crear({
      usuarioId: uid,
      titulo: `💰 Cobro pendiente ${codigo}`,
      mensaje: `La obra ${codigo} tiene cobro pendiente desde hace ${dias} días`,
      severidad: sev,
      tipo: 'COBRO_PENDIENTE',
      enlace: `/cobros`,
      entidadTipo: 'obra',
      entidadId: obraId,
    });
  }
}

export async function notificarMaterialAprobado(solicitudId: string, codigo: string, responsableIds: string[]) {
  for (const uid of responsableIds) {
    await crear({
      usuarioId: uid,
      titulo: `✅ Material aprobado — ${codigo}`,
      mensaje: `La solicitud de material para ${codigo} ha sido aprobada`,
      severidad: 'INFO',
      tipo: 'MATERIAL',
      enlace: `/materiales`,
      entidadTipo: 'solicitud_material',
      entidadId: solicitudId,
    });
  }
}
