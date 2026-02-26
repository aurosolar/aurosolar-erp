// src/app/api/incidencias/[id]/route.ts
import { z } from 'zod';
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  estado: z.enum(['ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA']),
  notasResolucion: z.string().optional(),
  asignadoAId: z.string().uuid().optional(),
});

export const PATCH = withAuth('incidencias:resolver', async (req, { usuario }) => {
  const id = req.nextUrl.pathname.split('/').pop()!;
  const input = await updateSchema.parseAsync(await req.json());

  const incidencia = await prisma.incidencia.findUnique({ where: { id } });
  if (!incidencia) return apiError('Incidencia no encontrada', 404);

  const updated = await prisma.incidencia.update({
    where: { id },
    data: {
      estado: input.estado,
      notasResolucion: input.notasResolucion,
      asignadoAId: input.asignadoAId,
      fechaResolucion: ['RESUELTA', 'CERRADA'].includes(input.estado) ? new Date() : null,
    },
  });

  // Si se resuelve/cierra, recalcular flag de incidencia crítica en la obra
  if (['RESUELTA', 'CERRADA'].includes(input.estado) && incidencia.obraId) {
    const criticasAbiertas = await prisma.incidencia.count({
      where: {
        obraId: incidencia.obraId,
        gravedad: 'CRITICA',
        estado: { in: ['ABIERTA', 'EN_PROCESO'] },
        id: { not: id },
      },
    });
    await prisma.obra.update({
      where: { id: incidencia.obraId },
      data: { tieneIncidenciaCritica: criticasAbiertas > 0 },
    });
  }

  // Registrar actividad
  await prisma.actividad.create({
    data: {
      obraId: incidencia.obraId,
      usuarioId: usuario.id,
      accion: 'INCIDENCIA_RESUELTA',
      entidad: 'incidencia',
      entidadId: id,
      detalle: JSON.stringify({ estado: input.estado, notas: input.notasResolucion }),
    },
  });

  logger.info('incidencia_resuelta', { id, estado: input.estado, usuario: usuario.email });
  return apiOk(updated);
});
