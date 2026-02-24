// src/app/api/campo/checkin/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const checkinSchema = z.object({
  obraId: z.string().uuid(),
  nota: z.string().optional(),
  latitud: z.number().nullable().optional(),
  longitud: z.number().nullable().optional(),
});

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  const input = await checkinSchema.parseAsync(await req.json());

  // Crear checkin
  const checkin = await prisma.checkin.create({
    data: {
      obraId: input.obraId,
      instaladorId: usuario.id,
      horaEntrada: new Date(),
      nota: input.nota,
      latitud: input.latitud ?? null,
      longitud: input.longitud ?? null,
    },
  });

  // Si la obra estaba en PROGRAMADA, cambiar a INSTALANDO
  const obra = await prisma.obra.findUnique({ where: { id: input.obraId } });
  if (obra && obra.estado === 'PROGRAMADA') {
    await prisma.obra.update({
      where: { id: input.obraId },
      data: { estado: 'INSTALANDO', fechaInicio: obra.fechaInicio || new Date() },
    });

    await prisma.actividad.create({
      data: {
        obraId: input.obraId,
        usuarioId: usuario.id,
        accion: 'ESTADO_CAMBIADO',
        entidad: 'obra',
        entidadId: input.obraId,
        detalle: JSON.stringify({ estadoAnterior: 'PROGRAMADA', nuevoEstado: 'INSTALANDO', motivo: 'Check-in automático' }),
      },
    });
  }

  // Registrar actividad del checkin
  await prisma.actividad.create({
    data: {
      obraId: input.obraId,
      usuarioId: usuario.id,
      accion: 'CHECKIN_REGISTRADO',
      entidad: 'checkin',
      entidadId: checkin.id,
      detalle: JSON.stringify({ nota: input.nota }),
    },
  });

  logger.info('checkin_registrado', { obraId: input.obraId, instalador: usuario.email });
  return apiOk(checkin, 201);
});
