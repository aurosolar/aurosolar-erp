// src/services/jornada.service.ts
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// ── Obtener jornada activa del empleado ──
export async function jornadaActiva(empleadoId: string) {
  const shift = await prisma.workShift.findFirst({
    where: { empleadoId, endTime: null },
    orderBy: { startTime: 'desc' },
    include: {
      sessions: {
        orderBy: { startTime: 'desc' },
        include: {
          obra: {
            select: {
              id: true, codigo: true, tipo: true, estado: true,
              localidad: true, direccionInstalacion: true, potenciaKwp: true,
              cliente: { select: { nombre: true, apellidos: true, telefono: true } },
            },
          },
        },
      },
      events: {
        where: { endTime: null },
        orderBy: { startTime: 'desc' },
        take: 1,
      },
    },
  });
  if (!shift) return null;

  const sesionActiva = shift.sessions.find(s => !s.endTime) || null;
  const pausaActiva = shift.events.find(e => e.tipo === 'PAUSA' && !e.endTime) || null;

  const pausadas = await sesionesPausadas(shift.id);
  return { shift, sesionActiva, pausaActiva, obrasPausadas: pausadas };
}

// ── Iniciar jornada ──
export async function iniciarJornada(empleadoId: string, input: {
  lat?: number; lng?: number; obraId?: string; nota?: string;
}) {
  // Verificar que no hay jornada activa
  const existente = await prisma.workShift.findFirst({
    where: { empleadoId, endTime: null },
  });
  if (existente) throw new Error('Ya tienes una jornada activa');

  const shift = await prisma.workShift.create({
    data: {
      empleadoId,
      startTime: new Date(),
      startLat: input.lat ?? null,
      startLng: input.lng ?? null,
      nota: input.nota ?? null,
    },
  });

  logger.info('jornada_iniciada', { shiftId: shift.id, empleadoId });

  // Si seleccionó obra, iniciar sesión automáticamente
  if (input.obraId) {
    const sesion = await iniciarSesion(empleadoId, shift.id, input.obraId);
    return { shift, sesion };
  }

  return { shift, sesion: null };
}

// ── Iniciar sesión en obra ──
export async function iniciarSesion(empleadoId: string, shiftId: string, obraId: string, nota?: string, sessionTipo?: string) {
  // Cerrar sesión anterior si existe
  const sesionAbierta = await prisma.workSession.findFirst({
    where: { shiftId, empleadoId, endTime: null },
  });
  if (sesionAbierta) {
    await cerrarSesion(sesionAbierta.id);
  }

  const sesion = await prisma.workSession.create({
    data: {
      shiftId,
      obraId,
      empleadoId,
      startTime: new Date(),
      nota: nota ?? null,
      sessionTipo: sessionTipo || 'TRABAJO',
    },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true, estado: true,
          localidad: true, direccionInstalacion: true, potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
    },
  });

  // Transición de estado: PROGRAMADA → INSTALANDO (solo si es trabajo, no espera)
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { estado: true } });
  if (obra && obra.estado === 'PROGRAMADA' && (sessionTipo || 'TRABAJO') === 'TRABAJO') {
    await prisma.obra.update({
      where: { id: obraId },
      data: { estado: 'INSTALANDO', fechaInicio: new Date() },
    });
    await prisma.actividad.create({
      data: {
        obraId, usuarioId: empleadoId,
        accion: 'ESTADO_CAMBIADO', entidad: 'obra', entidadId: obraId,
        detalle: JSON.stringify({ estadoAnterior: 'PROGRAMADA', nuevoEstado: 'INSTALANDO', motivo: 'Inicio sesión de trabajo' }),
      },
    });
  }

  await prisma.actividad.create({
    data: {
      obraId, usuarioId: empleadoId,
      accion: 'SESION_INICIADA', entidad: 'work_session', entidadId: sesion.id,
      detalle: JSON.stringify({ shiftId }),
    },
  });

  logger.info('sesion_iniciada', { sessionId: sesion.id, shiftId, obraId, empleadoId });
  return sesion;
}

// ── Cerrar sesión ──
export async function cerrarSesion(sessionId: string, cierreTipo?: string) {
  const sesion = await prisma.workSession.findUnique({ where: { id: sessionId } });
  if (!sesion || sesion.endTime) throw new Error('Sesión no encontrada o ya cerrada');

  const ahora = new Date();
  const durationMin = Math.round((ahora.getTime() - sesion.startTime.getTime()) / 60000);

  const updated = await prisma.workSession.update({
    where: { id: sessionId },
    data: { endTime: ahora, durationMin, cierreTipo: cierreTipo || null },
  });

  await prisma.actividad.create({
    data: {
      obraId: sesion.obraId, usuarioId: sesion.empleadoId,
      accion: 'SESION_CERRADA', entidad: 'work_session', entidadId: sessionId,
      detalle: JSON.stringify({ durationMin, cierreTipo }),
    },
  });

  logger.info('sesion_cerrada', { sessionId, durationMin, cierreTipo });
  return updated;
}

// ── Retomar sesión pausada ──
export async function retomarSesion(empleadoId: string, shiftId: string, obraId: string) {
  // Cerrar sesión actual si hay una abierta
  const sesionAbierta = await prisma.workSession.findFirst({
    where: { shiftId, empleadoId, endTime: null },
  });
  if (sesionAbierta) {
    await cerrarSesion(sesionAbierta.id, 'PAUSA');
  }

  // Crear nueva sesión en la misma obra
  const sesion = await prisma.workSession.create({
    data: {
      shiftId, obraId, empleadoId,
      startTime: new Date(),
      nota: 'Retomada desde pausa',
    },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true, estado: true,
          localidad: true, direccionInstalacion: true, potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
    },
  });

  logger.info('sesion_retomada', { sessionId: sesion.id, shiftId, obraId });
  return sesion;
}

// ── Listar sesiones pausadas de la jornada actual ──
export async function sesionesPausadas(shiftId: string) {
  // Buscar obras con sesiones cerradas como PAUSA que no tienen sesión activa después
  const sesiones = await prisma.workSession.findMany({
    where: { shiftId, cierreTipo: 'PAUSA' },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true,
          cliente: { select: { nombre: true, apellidos: true } },
          localidad: true,
        },
      },
    },
    orderBy: { endTime: 'desc' },
  });

  // Filtrar: solo las que no tienen sesión activa posterior en la misma obra
  const obrasConSesionActiva = await prisma.workSession.findMany({
    where: { shiftId, endTime: null },
    select: { obraId: true },
  });
  const obrasActivasSet = new Set(obrasConSesionActiva.map(s => s.obraId));

  // Agrupar por obra, mostrar solo las últimas por obra que estén pausadas
  const obrasPausadas = new Map<string, typeof sesiones[0]>();
  for (const s of sesiones) {
    if (!obrasActivasSet.has(s.obraId) && !obrasPausadas.has(s.obraId)) {
      obrasPausadas.set(s.obraId, s);
    }
  }

  return Array.from(obrasPausadas.values());
}

// ── Iniciar/cerrar pausa ──
export async function togglePausa(shiftId: string) {
  const pausaActiva = await prisma.workEvent.findFirst({
    where: { shiftId, tipo: 'PAUSA', endTime: null },
  });

  if (pausaActiva) {
    // Cerrar pausa
    const updated = await prisma.workEvent.update({
      where: { id: pausaActiva.id },
      data: { endTime: new Date() },
    });
    logger.info('pausa_cerrada', { eventId: pausaActiva.id, shiftId });
    return { accion: 'cerrada', event: updated };
  } else {
    // Abrir pausa
    const event = await prisma.workEvent.create({
      data: { shiftId, tipo: 'PAUSA', startTime: new Date() },
    });
    logger.info('pausa_iniciada', { eventId: event.id, shiftId });
    return { accion: 'iniciada', event };
  }
}

// ── Finalizar jornada ──
export async function finalizarJornada(empleadoId: string, input: {
  lat?: number; lng?: number; nota?: string;
}) {
  const shift = await prisma.workShift.findFirst({
    where: { empleadoId, endTime: null },
    include: {
      sessions: { where: { endTime: null } },
      events: { where: { endTime: null } },
    },
  });
  if (!shift) throw new Error('No hay jornada activa');

  const ahora = new Date();

  // Cerrar sesiones abiertas
  for (const s of shift.sessions) {
    await cerrarSesion(s.id);
  }

  // Cerrar pausas abiertas
  for (const e of shift.events) {
    await prisma.workEvent.update({ where: { id: e.id }, data: { endTime: ahora } });
  }

  const updated = await prisma.workShift.update({
    where: { id: shift.id },
    data: {
      endTime: ahora,
      endLat: input.lat ?? null,
      endLng: input.lng ?? null,
      notaCierre: input.nota ?? null,
    },
  });

  logger.info('jornada_finalizada', { shiftId: shift.id, empleadoId });
  return updated;
}

// ── Cambiar sesión de ESPERA a TRABAJO ──
export async function cambiarEsperaATrabajo(sessionId: string) {
  const sesion = await prisma.workSession.findUnique({ where: { id: sessionId } });
  if (!sesion || sesion.endTime) throw new Error('Sesión no encontrada o cerrada');
  if (sesion.sessionTipo !== 'ESPERA') throw new Error('La sesión no está en espera');

  // Cerrar sesión de espera
  const ahora = new Date();
  const durationMin = Math.round((ahora.getTime() - sesion.startTime.getTime()) / 60000);
  await prisma.workSession.update({
    where: { id: sessionId },
    data: { endTime: ahora, durationMin },
  });

  // Crear nueva sesión de trabajo en la misma obra
  const nueva = await prisma.workSession.create({
    data: {
      shiftId: sesion.shiftId,
      obraId: sesion.obraId,
      empleadoId: sesion.empleadoId,
      startTime: ahora,
      sessionTipo: 'TRABAJO',
      nota: 'Inicio tras espera',
    },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true, estado: true,
          localidad: true, direccionInstalacion: true, potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
    },
  });

  // Transición estado si PROGRAMADA
  const obra = await prisma.obra.findUnique({ where: { id: sesion.obraId }, select: { estado: true } });
  if (obra && obra.estado === 'PROGRAMADA') {
    await prisma.obra.update({
      where: { id: sesion.obraId },
      data: { estado: 'INSTALANDO', fechaInicio: ahora },
    });
    await prisma.actividad.create({
      data: {
        obraId: sesion.obraId, usuarioId: sesion.empleadoId,
        accion: 'ESTADO_CAMBIADO', entidad: 'obra', entidadId: sesion.obraId,
        detalle: JSON.stringify({ estadoAnterior: 'PROGRAMADA', nuevoEstado: 'INSTALANDO', motivo: 'Inicio trabajo tras espera' }),
      },
    });
  }

  logger.info('espera_a_trabajo', { oldSessionId: sessionId, newSessionId: nueva.id, esperaMin: durationMin });
  return nueva;
}

// ── Calcular tiempo total en obra hoy (sumatorio sesiones) ──
export async function tiempoEnObraHoy(shiftId: string, obraId: string) {
  const sesiones = await prisma.workSession.findMany({
    where: { shiftId, obraId },
    select: { startTime: true, endTime: true, sessionTipo: true, durationMin: true },
  });

  let trabajoMin = 0;
  let esperaMin = 0;
  const ahora = new Date();

  for (const s of sesiones) {
    const dur = s.endTime
      ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000)
      : Math.round((ahora.getTime() - s.startTime.getTime()) / 60000);
    if (s.sessionTipo === 'ESPERA') esperaMin += dur;
    else trabajoMin += dur;
  }

  return { trabajoMin, esperaMin, totalMin: trabajoMin + esperaMin };
}

