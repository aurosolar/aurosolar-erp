// src/services/planificacion.service.ts
// Sprint UX-4: Jornadas de obra
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Timezone-safe date helper: always use noon UTC to avoid day shifts
function toDateSafe(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00Z');
}
function formatDateStr(d: Date): string {
  // Return YYYY-MM-DD regardless of timezone
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ═══════════════════════════════════════
// Schedule semanal — para vista Gantt
// ═══════════════════════════════════════
export async function listarSchedule(desde: Date, hasta: Date) {
  const instaladores = await prisma.usuario.findMany({
    where: { rol: { in: ['INSTALADOR', 'JEFE_INSTALACIONES'] }, activo: true },
    select: { id: true, nombre: true, apellidos: true, rol: true },
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
  });

  const jornadas = await prisma.obraJornada.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
      obra: { deletedAt: null },
    },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true, estado: true,
          localidad: true, potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
      instaladores: {
        include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
      },
    },
    orderBy: { fecha: 'asc' },
  });

  return instaladores.map(inst => {
    const jornadasInst = jornadas.filter(j =>
      j.instaladores.some(ji => ji.instaladorId === inst.id)
    );
    return {
      id: inst.id,
      nombre: inst.nombre,
      apellidos: inst.apellidos || '',
      rol: inst.rol,
      esJefe: inst.rol === 'JEFE_INSTALACIONES',
      jornadas: jornadasInst.map(j => ({
        id: j.id,
        obraId: j.obra.id,
        codigo: j.obra.codigo,
        tipo: j.obra.tipo,
        estado: j.obra.estado,
        fecha: formatDateStr(j.fecha),
        horaInicio: j.horaInicio,
        horaFin: j.horaFin,
        notas: j.notas,
        localidad: j.obra.localidad,
        potenciaKwp: j.obra.potenciaKwp,
        cliente: `${j.obra.cliente.nombre} ${j.obra.cliente.apellidos}`,
      })),
    };
  });
}

// ═══════════════════════════════════════
// Listar eventos (legacy — para calendario simple)
// ═══════════════════════════════════════
export async function listarEventos(filtros?: {
  desde?: Date; hasta?: Date; instaladorId?: string;
}) {
  const desde = filtros?.desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const hasta = filtros?.hasta || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const jornadas = await prisma.obraJornada.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
      obra: { deletedAt: null },
      ...(filtros?.instaladorId ? {
        instaladores: { some: { instaladorId: filtros.instaladorId } },
      } : {}),
    },
    include: {
      obra: {
        select: {
          id: true, codigo: true, tipo: true, estado: true,
          direccionInstalacion: true, localidad: true, potenciaKwp: true,
          cliente: { select: { nombre: true, apellidos: true } },
        },
      },
      instaladores: {
        include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
      },
    },
    orderBy: { fecha: 'asc' },
  });

  return jornadas.map(j => ({
    id: j.obra.id,
    jornadaId: j.id,
    codigo: j.obra.codigo,
    titulo: `${j.obra.codigo} · ${j.obra.cliente.nombre} ${j.obra.cliente.apellidos}`,
    fecha: formatDateStr(j.fecha),
    horaInicio: j.horaInicio,
    horaFin: j.horaFin,
    tipo: j.obra.tipo,
    estado: j.obra.estado,
    direccion: j.obra.direccionInstalacion,
    localidad: j.obra.localidad,
    potencia: j.obra.potenciaKwp,
    instaladores: j.instaladores.map(ji => ({
      id: ji.instalador.id,
      nombre: `${ji.instalador.nombre} ${ji.instalador.apellidos || ''}`.trim(),
    })),
  }));
}

// ═══════════════════════════════════════
// Programar obra — crea jornada(s)
// ═══════════════════════════════════════
interface ProgramarInput {
  obraId: string;
  jornadas: Array<{
    fecha: string;       // "YYYY-MM-DD"
    horaInicio: string;  // "HH:MM"
    horaFin: string;     // "HH:MM"
  }>;
  instaladorIds: string[];
}

export async function programarObra(input: ProgramarInput, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (!obra) throw new Error('Obra no encontrada');
  if (input.jornadas.length === 0) throw new Error('Debe incluir al menos una jornada');

  // Validate hours
  for (const jornada of input.jornadas) {
    if (jornada.horaFin <= jornada.horaInicio) {
      throw new Error(`Jornada ${jornada.fecha}: la hora de fin debe ser posterior a la hora de inicio`);
    }
  }

  // Validate no overlaps per installer per day
  for (const jornada of input.jornadas) {
    const fechaDate = toDateSafe(jornada.fecha);
    for (const instId of input.instaladorIds) {
      const existing = await prisma.obraJornadaInstalador.findMany({
        where: {
          instaladorId: instId,
          jornada: {
            fecha: fechaDate,
            obra: {
              id: { not: input.obraId },
              deletedAt: null,
              estado: { in: ['PROGRAMADA', 'INSTALANDO'] },
            },
          },
        },
        include: {
          jornada: { include: { obra: { select: { codigo: true } } } },
          instalador: { select: { nombre: true } },
        },
      });

      // Check time overlap
      for (const ex of existing) {
        if (jornada.horaInicio < ex.jornada.horaFin && jornada.horaFin > ex.jornada.horaInicio) {
          throw new Error(
            `${ex.instalador.nombre} ya tiene ${ex.jornada.obra.codigo} el ${jornada.fecha} (${ex.jornada.horaInicio}-${ex.jornada.horaFin})`
          );
        }
      }
    }
  }

  // Sort jornadas by fecha
  const sorted = [...input.jornadas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primeraFecha = toDateSafe(sorted[0].fecha);

  // Update obra
  await prisma.obra.update({
    where: { id: input.obraId },
    data: {
      fechaProgramada: primeraFecha,
      estado: ['REVISION_TECNICA', 'PREPARANDO', 'PENDIENTE_MATERIAL'].includes(obra.estado)
        ? 'PROGRAMADA'
        : obra.estado,
    },
  });

  // Update legacy ObraInstalador (keep for backwards compat)
  await prisma.obraInstalador.deleteMany({ where: { obraId: input.obraId } });
  for (const instId of input.instaladorIds) {
    await prisma.obraInstalador.create({
      data: { obraId: input.obraId, instaladorId: instId },
    });
  }

  // Create jornadas
  for (const j of input.jornadas) {
    const fechaDate = toDateSafe(j.fecha);
    const jornada = await prisma.obraJornada.create({
      data: {
        obraId: input.obraId,
        fecha: fechaDate,
        horaInicio: j.horaInicio,
        horaFin: j.horaFin,
      },
    });
    for (const instId of input.instaladorIds) {
      await prisma.obraJornadaInstalador.create({
        data: { jornadaId: jornada.id, instaladorId: instId },
      });
    }
  }

  // Activity log
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId,
      accion: 'OBRA_PROGRAMADA',
      entidad: 'obra',
      entidadId: input.obraId,
      detalle: JSON.stringify({
        jornadas: input.jornadas,
        instaladores: input.instaladorIds,
      }),
    },
  });

  logger.info('obra_programada', { obraId: input.obraId, jornadas: input.jornadas.length });
  return { ok: true };
}

// ═══════════════════════════════════════
// Instaladores disponibles para una fecha
// ═══════════════════════════════════════
export async function instaladoresDisponibles(fecha: Date) {
  const fechaDate = new Date(fecha);
  fechaDate.setHours(0, 0, 0, 0);

  const instaladores = await prisma.usuario.findMany({
    where: { rol: { in: ['INSTALADOR', 'JEFE_INSTALACIONES'] }, activo: true },
    select: { id: true, nombre: true, apellidos: true },
  });

  const resultado = [];
  for (const inst of instaladores) {
    const obrasEseDia = await prisma.obraJornadaInstalador.count({
      where: {
        instaladorId: inst.id,
        jornada: {
          fecha: fechaDate,
          obra: {
            estado: { in: ['PROGRAMADA', 'INSTALANDO'] },
            deletedAt: null,
          },
        },
      },
    });
    resultado.push({
      ...inst,
      nombreCompleto: `${inst.nombre} ${inst.apellidos || ''}`.trim(),
      obrasEseDia,
      disponible: obrasEseDia === 0,
    });
  }

  return resultado;
}

// ═══════════════════════════════════════
// Obras sin programar (backlog)
// ═══════════════════════════════════════
export async function obrasSinProgramar() {
  return prisma.obra.findMany({
    where: {
      deletedAt: null,
      estado: { in: ['PREPARANDO', 'PENDIENTE_MATERIAL'] },
      jornadas: { none: {} },
    },
    select: {
      id: true, codigo: true, tipo: true, estado: true, createdAt: true,
      direccionInstalacion: true, localidad: true, potenciaKwp: true,
      numPaneles: true, inversor: true, bateriaKwh: true,
      cliente: { select: { nombre: true, apellidos: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}


// ═══════════════════════════════════════
// CRUD individual de jornadas
// ═══════════════════════════════════════

// Obtener jornadas de una obra con instaladores
export async function jornadasDeObra(obraId: string) {
  const obra = await prisma.obra.findUnique({
    where: { id: obraId },
    select: {
      id: true, codigo: true, tipo: true, estado: true, localidad: true,
      potenciaKwp: true,
      cliente: { select: { nombre: true, apellidos: true } },
    },
  });
  if (!obra) throw new Error('Obra no encontrada');

  const jornadas = await prisma.obraJornada.findMany({
    where: { obraId },
    include: {
      instaladores: {
        include: { instalador: { select: { id: true, nombre: true, apellidos: true } } },
      },
    },
    orderBy: { fecha: 'asc' },
  });

  return {
    obra: {
      ...obra,
      cliente: `${obra.cliente.nombre} ${obra.cliente.apellidos}`,
    },
    jornadas: jornadas.map(j => ({
      id: j.id,
      fecha: formatDateStr(j.fecha),
      horaInicio: j.horaInicio,
      horaFin: j.horaFin,
      notas: j.notas,
      instaladores: j.instaladores.map(ji => ({
        id: ji.instalador.id,
        nombre: ji.instalador.nombre,
        apellidos: ji.instalador.apellidos,
      })),
    })),
  };
}

// Crear una jornada individual
export async function crearJornada(input: {
  obraId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  instaladorIds: string[];
  notas?: string;
}, usuarioId: string) {
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (!obra) throw new Error('Obra no encontrada');

  const fechaDate = toDateSafe(input.fecha);

  // Validate hours
  if (input.horaFin <= input.horaInicio) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio');
  }

  // Validate overlaps
  for (const instId of input.instaladorIds) {
    const existing = await prisma.obraJornadaInstalador.findMany({
      where: {
        instaladorId: instId,
        jornada: {
          fecha: fechaDate,
          obra: { id: { not: input.obraId }, deletedAt: null, estado: { in: ['PROGRAMADA', 'INSTALANDO'] } },
        },
      },
      include: {
        jornada: { include: { obra: { select: { codigo: true } } } },
        instalador: { select: { nombre: true } },
      },
    });
    for (const ex of existing) {
      if (input.horaInicio < ex.jornada.horaFin && input.horaFin > ex.jornada.horaInicio) {
        throw new Error(`${ex.instalador.nombre} ya tiene ${ex.jornada.obra.codigo} el ${input.fecha} (${ex.jornada.horaInicio}-${ex.jornada.horaFin})`);
      }
    }
  }

  const jornada = await prisma.obraJornada.create({
    data: {
      obraId: input.obraId,
      fecha: fechaDate,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      notas: input.notas || null,
    },
  });

  for (const instId of input.instaladorIds) {
    await prisma.obraJornadaInstalador.create({
      data: { jornadaId: jornada.id, instaladorId: instId },
    });
  }

  // Update obra.fechaProgramada to earliest jornada
  await syncObraFechaProgramada(input.obraId);

  // If obra not yet PROGRAMADA, transition
  if (['PREPARANDO', 'PENDIENTE_MATERIAL', 'REVISION_TECNICA'].includes(obra.estado)) {
    await prisma.obra.update({ where: { id: input.obraId }, data: { estado: 'PROGRAMADA' } });
  }

  // Sync legacy ObraInstalador
  await syncLegacyInstaladores(input.obraId);

  await prisma.actividad.create({
    data: { obraId: input.obraId, usuarioId, accion: 'JORNADA_CREADA', entidad: 'obra', entidadId: input.obraId,
      detalle: JSON.stringify({ jornadaId: jornada.id, fecha: input.fecha, horaInicio: input.horaInicio, horaFin: input.horaFin }) },
  });

  return jornada;
}

// Editar una jornada individual
export async function editarJornada(jornadaId: string, input: {
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  instaladorIds?: string[];
  notas?: string;
}, usuarioId: string) {
  const jornada = await prisma.obraJornada.findUnique({
    where: { id: jornadaId },
    include: {
      obra: { select: { id: true, estado: true } },
      instaladores: { select: { instaladorId: true } },
    },
  });
  if (!jornada) throw new Error('Jornada no encontrada');

  const fecha = input.fecha || formatDateStr(jornada.fecha);
  const horaInicio = input.horaInicio || jornada.horaInicio;
  const horaFin = input.horaFin || jornada.horaFin;
  const fechaDate = toDateSafe(fecha);

  // Validate hours
  if (horaFin <= horaInicio) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio');
  }

  // Validate overlaps for all instaladores (existing or new)
  const checkInstIds = input.instaladorIds || jornada.instaladores?.map((ji: any) => ji.instaladorId) || [];
  if (checkInstIds.length > 0) {
    for (const instId of checkInstIds) {
      const existing = await prisma.obraJornadaInstalador.findMany({
        where: {
          instaladorId: instId,
          jornada: {
            id: { not: jornadaId },
            fecha: fechaDate,
            obra: { id: { not: jornada.obra.id }, deletedAt: null, estado: { in: ['PROGRAMADA', 'INSTALANDO'] } },
          },
        },
        include: {
          jornada: { include: { obra: { select: { codigo: true } } } },
          instalador: { select: { nombre: true } },
        },
      });
      for (const ex of existing) {
        if (horaInicio < ex.jornada.horaFin && horaFin > ex.jornada.horaInicio) {
          throw new Error(`${ex.instalador.nombre} ya tiene ${ex.jornada.obra.codigo} el ${fecha} (${ex.jornada.horaInicio}-${ex.jornada.horaFin})`);
        }
      }
    }
  }

  // Update jornada
  await prisma.obraJornada.update({
    where: { id: jornadaId },
    data: {
      ...(input.fecha ? { fecha: fechaDate } : {}),
      ...(input.horaInicio ? { horaInicio: input.horaInicio } : {}),
      ...(input.horaFin ? { horaFin: input.horaFin } : {}),
      ...(input.notas !== undefined ? { notas: input.notas || null } : {}),
    },
  });

  // Update instaladores if provided
  if (input.instaladorIds) {
    await prisma.obraJornadaInstalador.deleteMany({ where: { jornadaId } });
    for (const instId of input.instaladorIds) {
      await prisma.obraJornadaInstalador.create({
        data: { jornadaId, instaladorId: instId },
      });
    }
  }

  await syncObraFechaProgramada(jornada.obra.id);
  await syncLegacyInstaladores(jornada.obra.id);

  await prisma.actividad.create({
    data: { obraId: jornada.obra.id, usuarioId, accion: 'JORNADA_EDITADA', entidad: 'obra', entidadId: jornada.obra.id,
      detalle: JSON.stringify({ jornadaId, cambios: input }) },
  });

  return { ok: true };
}

// Eliminar una jornada individual
export async function eliminarJornada(jornadaId: string, usuarioId: string) {
  const jornada = await prisma.obraJornada.findUnique({
    where: { id: jornadaId },
    include: {
      obra: { select: { id: true, estado: true } },
      instaladores: { select: { instaladorId: true } },
    },
  });
  if (!jornada) throw new Error('Jornada no encontrada');

  await prisma.obraJornada.delete({ where: { id: jornadaId } });

  // Check if obra has remaining jornadas
  const remaining = await prisma.obraJornada.count({ where: { obraId: jornada.obra.id } });
  if (remaining === 0) {
    // No jornadas left — desprogramar
    await prisma.obra.update({
      where: { id: jornada.obra.id },
      data: { estado: 'PREPARANDO', fechaProgramada: null },
    });
    await prisma.obraInstalador.deleteMany({ where: { obraId: jornada.obra.id } });
  } else {
    await syncObraFechaProgramada(jornada.obra.id);
    await syncLegacyInstaladores(jornada.obra.id);
  }

  await prisma.actividad.create({
    data: { obraId: jornada.obra.id, usuarioId, accion: 'JORNADA_ELIMINADA', entidad: 'obra', entidadId: jornada.obra.id,
      detalle: JSON.stringify({ jornadaId, fecha: formatDateStr(jornada.fecha) }) },
  });

  return { ok: true };
}

// ── Helpers ──

async function syncObraFechaProgramada(obraId: string) {
  const primera = await prisma.obraJornada.findFirst({
    where: { obraId },
    orderBy: { fecha: 'asc' },
  });
  await prisma.obra.update({
    where: { id: obraId },
    data: { fechaProgramada: primera ? toDateSafe(formatDateStr(primera.fecha)) : null },
  });
}

async function syncLegacyInstaladores(obraId: string) {
  // Collect unique instaladores across all jornadas
  const jornadaInst = await prisma.obraJornadaInstalador.findMany({
    where: { jornada: { obraId } },
    select: { instaladorId: true },
    distinct: ['instaladorId'],
  });
  await prisma.obraInstalador.deleteMany({ where: { obraId } });
  for (const ji of jornadaInst) {
    await prisma.obraInstalador.create({
      data: { obraId, instaladorId: ji.instaladorId },
    });
  }
}

// Listar todos los instaladores activos (para selección en modal)
export async function listarInstaladores() {
  return prisma.usuario.findMany({
    where: { rol: { in: ['INSTALADOR', 'JEFE_INSTALACIONES'] }, activo: true },
    select: { id: true, nombre: true, apellidos: true, rol: true },
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
  });
}
